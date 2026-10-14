import { test, expect, chromium, type Page } from '@playwright/test';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const fixture = path.resolve(
  'public/images/products/blazer-noir/noir-front.webp',
);
async function garmentPixels(page: Page) {
  return page
    .locator('canvas[aria-label]')
    .evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas
        .getContext('2d')!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) visible++;
      return visible;
    });
}
test('private photo fitting runs real local AI, retains the overlay, switches garments and hands size/color to the basket', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  await page.goto('/probador-virtual');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await expect(page.getByRole('button', { name: /^Probar / })).toHaveCount(18);
  expect(requests.filter((r) => r.url.includes('/models/pose/'))).toHaveLength(
    0,
  );
  const headers = await request.get('/probador-virtual');
  expect(headers.headers()['permissions-policy']).toContain('camera=(self)');
  const before = requests.length;
  await page.getByLabel('Subir foto local').setInputFiles(fixture);
  await expect(page.locator('.fitting-status [role="status"]')).toHaveText(
    'Cuerpo detectado',
    { timeout: 90000 },
  );
  await expect.poll(() => garmentPixels(page)).toBeGreaterThan(1000);
  await page.waitForTimeout(1600);
  expect(await garmentPixels(page)).toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'Color Ivory', exact: true }).click();
  await expect(page.locator('.fitting-view-label')).toContainText('Ivory');
  await expect.poll(() => garmentPixels(page)).toBeGreaterThan(1000);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar vista previa' }).click();
  expect((await download).suggestedFilename()).toBe(
    'elite-atelier-blazer-noir-preview.jpg',
  );
  await page
    .getByRole('button', { name: 'Probar Bomber Urbain', exact: true })
    .click();
  await expect(page.locator('.fitting-selection h2')).toHaveText(
    'Bomber Urbain',
  );
  await expect.poll(() => garmentPixels(page)).toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'L', exact: true }).click();
  expect(requests.slice(before).filter((r) => r.method === 'POST')).toEqual([]);
  expect(
    requests.filter(
      (r) => /^https?:/.test(r.url) && new URL(r.url).hostname !== 'localhost',
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'data:image',
  );
  await page
    .getByRole('button', { name: 'AÑADIR A MI SELECCIÓN', exact: true })
    .click();
  await expect(page.locator('.cart-drawer')).toContainText('Bomber Urbain');
  await expect(page.locator('.cart-drawer')).toContainText('Taupe / L');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Apagar cámara y borrar foto' })
    .click();
  await expect(
    page.getByAltText('Tu foto local para la vista previa'),
  ).toHaveCount(0);
  expect(await garmentPixels(page)).toBe(0);
  await expect(page.locator('.fitting-status [role="status"]')).toHaveText(
    'Sin cámara',
  );
  expect(errors).toEqual([]);
});

// YUV fixture uses an existing generated catalog photo, never personal camera data.
async function cameraFixture() {
  const width = 640,
    height = 480;
  const rgb = await sharp(fixture)
    .resize({ width: 240, height: 480, fit: 'contain', background: '#d6d6d6' })
    .extend({ left: 200, right: 200, top: 0, bottom: 0, background: '#d6d6d6' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const y = Buffer.alloc(width * height),
    u = Buffer.alloc((width * height) / 4),
    v = Buffer.alloc((width * height) / 4);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++) {
      const i = (row * width + col) * 3,
        r = rgb[i],
        g = rgb[i + 1],
        b = rgb[i + 2];
      y[row * width + col] = clamp(16 + 0.257 * r + 0.504 * g + 0.098 * b);
      if (row % 2 === 0 && col % 2 === 0) {
        const j = (row / 2) * (width / 2) + col / 2;
        u[j] = clamp(128 - 0.148 * r - 0.291 * g + 0.439 * b);
        v[j] = clamp(128 + 0.439 * r - 0.368 * g - 0.071 * b);
      }
    }
  const file = path.resolve('.data/camera-fixture.y4m');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    Buffer.concat([
      Buffer.from(
        `YUV4MPEG2 W${width} H${height} F12:1 Ip A1:1 C420jpeg\nFRAME\n`,
      ),
      y,
      u,
      v,
    ]),
  );
  return file;
}
test('live camera detects a body and releases every track on stop and route change', async ({}, testInfo) => {
  test.setTimeout(150000);
  const launch = testInfo.project.use.launchOptions || {};
  const browser = await chromium.launch({
    ...launch,
    args: [
      ...(launch.args || []),
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--use-file-for-fake-video-capture=' + (await cameraFixture()),
    ],
  });
  try {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3000',
      permissions: ['camera'],
    });
    await context.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      (
        window as unknown as { capturedTracks: MediaStreamTrack[] }
      ).capturedTracks = [];
      navigator.mediaDevices.getUserMedia = async (options) => {
        const stream = await original(options);
        (
          window as unknown as { capturedTracks: MediaStreamTrack[] }
        ).capturedTracks.push(...stream.getTracks());
        return stream;
      };
    });
    const page = await context.newPage();
    await page.goto('/probador-virtual');
    await page.getByRole('button', { name: 'Solo esenciales' }).click();
    for (const exit of ['stop', 'route']) {
      await page.getByRole('button', { name: 'ACTIVAR MI CÁMARA' }).click();
      await expect(page.locator('.fitting-status [role="status"]')).toHaveText(
        'Cuerpo detectado',
        { timeout: 90000 },
      );
      await expect.poll(() => garmentPixels(page)).toBeGreaterThan(1000);
      if (exit === 'stop')
        await page
          .getByRole('button', { name: 'Apagar cámara y borrar foto' })
          .click();
      else
        await page
          .locator('.desktop-nav')
          .getByRole('link', { name: 'Colecciones', exact: true })
          .click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as unknown as { capturedTracks: MediaStreamTrack[] }
            ).capturedTracks.every((t) => t.readyState === 'ended'),
          ),
        )
        .toBe(true);
    }
  } finally {
    await browser.close();
  }
});

test('denied camera permission and unsupported photos give useful recovery without starting a stream', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto('/probador-virtual');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'ACTIVAR MI CÁMARA' }).click();
  await expect(page.locator('.fitting-error[role="alert"]')).toContainText(
    'El permiso de cámara fue rechazado',
  );
  await expect(
    page.getByRole('button', { name: 'ACTIVAR MI CÁMARA' }),
  ).toBeEnabled();
  await page.getByLabel('Subir foto local').setInputFiles({
    name: 'unsupported.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.locator('.fitting-error[role="alert"]')).toContainText(
    'JPG, PNG o WebP',
  );
  expect(
    await page.locator('video').evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBe(null);
});
