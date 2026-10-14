import { test, expect, type APIRequestContext } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import path from 'node:path';
import sharp from 'sharp';
const headers = { Origin: 'http://localhost:3000' };
let server: Server;
let calls: any[] = [];
let output: string;
const status = new Map<string, number>();
async function register(r: APIRequestContext) {
  const email = 'tryon-' + crypto.randomUUID() + '@example.com';
  const res = await r.post('/api/auth/register', {
    headers,
    data: { email, name: 'Try On Test', password: 'try-on-private-pass-12345' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).user;
}
async function submit(
  r: APIRequestContext,
  key: string,
  consent = 'true',
  color = 'Noir',
) {
  return r.post('/api/try-on/start', {
    headers,
    multipart: {
      key,
      consent,
      productId: 'p-noir',
      color,
      photo: {
        name: 'me.webp',
        mimeType: 'image/webp',
        buffer: await readFile(
          'public/images/products/blazer-noir/noir-front.webp',
        ),
      },
    },
  });
}
test.beforeAll(async () => {
  output = (
    await sharp('public/images/products/blazer-noir/noir-front.webp')
      .resize(700)
      .jpeg()
      .toBuffer()
  ).toString('base64');
  server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/run') {
      let body = '';
      for await (const chunk of req) body += chunk;
      calls.push(JSON.parse(body));
      const id = 'prediction-' + calls.length;
      status.set(id, 0);
      res.end(JSON.stringify({ id, error: null }));
      return;
    }
    if (req.url?.startsWith('/v1/status/')) {
      const id = req.url.split('/').pop()!;
      const count = status.get(id) || 0;
      status.set(id, count + 1);
      // Real SDK transport, simulated provider; alternate raw private Base64 and data URL forms.
      res.end(
        JSON.stringify({
          id,
          status: count ? 'completed' : 'processing',
          error: null,
          output: count
            ? [calls.length % 2 ? output : 'data:image/jpeg;base64,' + output]
            : null,
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((resolve) =>
    server.listen(9023, '127.0.0.1', resolve),
  );
});
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
test('official FASHN transport validates consent, reuses jobs, protects private output and deletes associations', async ({
  request,
  playwright,
}) => {
  await register(request);
  const config = await (await request.get('/api/try-on/config')).json();
  expect(config).toEqual({
    provider: 'FASHN',
    configured: true,
    model: 'tryon-max',
    localPreview: true,
  });
  expect((await submit(request, crypto.randomUUID(), 'false')).status()).toBe(
    400,
  );
  expect(calls).toHaveLength(0);
  const key = crypto.randomUUID();
  const start = await submit(request, key);
  expect(start.status(), await start.text()).toBe(202);
  const job = await start.json();
  expect(calls).toHaveLength(1);
  expect(calls[0].model_name).toBe('tryon-max');
  expect(calls[0].inputs).toMatchObject({
    return_base64: true,
    generation_mode: 'quality',
    output_format: 'jpeg',
    resolution: '1k',
    num_images: 1,
  });
  expect(calls[0].inputs.model_image).toMatch(/^data:image\/jpeg;base64,/);
  const duplicate = await submit(request, key);
  expect((await duplicate.json()).id).toBe(job.id);
  expect(calls).toHaveLength(1);
  const other = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  });
  await register(other);
  expect((await other.get('/api/try-on/jobs/' + job.id)).status()).toBe(404);
  await other.dispose();
  const processing = await (
    await request.get('/api/try-on/jobs/' + job.id)
  ).json();
  expect(processing.status).toBe('processing');
  const completed = await request.get('/api/try-on/jobs/' + job.id);
  expect(completed.headers()['cache-control']).toBe('no-store');
  const result = await completed.json();
  expect(result.status).toBe('completed');
  expect(result.image).toMatch(/^data:image\/jpeg;base64,/);
  const c = createClient({
    url:
      process.env.ATELIER_E2E_DB_URL || 'file:' + path.resolve('.data/e2e.db'),
  });
  const row = (
    await c.execute({
      sql: 'SELECT * FROM try_on_jobs WHERE id=?',
      args: [job.id],
    })
  ).rows[0];
  expect(Object.keys(row)).not.toContain('photo');
  expect(Object.keys(row)).not.toContain('output');
  expect(JSON.stringify(row)).not.toContain('base64');
  c.close();
  expect(
    (
      await request.post('/api/try-on/delete', {
        headers,
        data: { id: job.id },
      })
    ).status(),
  ).toBe(200);
  expect((await request.get('/api/try-on/jobs/' + job.id)).status()).toBe(404);
});
test('photo capture, explicit provider consent, progress, comparison and memory cleanup work in the browser', async ({
  page,
}) => {
  test.setTimeout(120000);
  await register(page.request);
  await page.goto('/probador-virtual');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page
    .locator('.fitting-stage-actions:visible')
    .getByLabel('Subir foto local')
    .setInputFiles('public/images/products/blazer-noir/noir-front.webp');
  await expect(page.locator('.fitting-status [role="status"]')).toHaveText(
    'Cuerpo detectado',
    { timeout: 90000 },
  );
  await page.getByRole('button', { name: 'Capturar mi foto' }).click();
  const generate = page.getByRole('button', { name: 'GENERAR LOOK REALISTA' });
  await expect(generate).toBeDisabled();
  await page.locator('.provider-consent input').check();
  await generate.click();
  await expect(
    page.getByLabel('Comparar foto original y look generado'),
  ).toBeVisible({ timeout: 20000 });
  await page.getByLabel('Comparar foto original y look generado').fill('75');
  const image = page.locator('.tryon-comparison img').last();
  await expect(image).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: /Descargar look/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.jpg$/);
  await page.getByRole('button', { name: /Borrar/ }).click();
  await expect(
    page.getByLabel('Comparar foto original y look generado'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((s) => s.includes('data:image')),
    ),
  ).toBe(false);
});
