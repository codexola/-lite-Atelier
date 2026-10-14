import { test, expect, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClient } from '@libsql/client';
import { hashPassword } from '../src/lib/password';
import { products } from '../src/lib/catalog';
import { productColors } from '../src/lib/garment-assets';
import path from 'node:path';
const origin = { Origin: 'http://localhost:3000' };
const adminEmail = 'test-admin@example.com';
const password = 'test-only-password-12345';
async function post(request: APIRequestContext, url: string, data: unknown) {
  return request.post('/api/' + url, { data, headers: origin });
}
test.beforeAll(async () => {
  const c = createClient({
    url:
      process.env.ATELIER_E2E_DB_URL || 'file:' + path.resolve('.data/e2e.db'),
  });
  await c.execute({
    sql: "INSERT OR IGNORE INTO users(id,email,name,password,role) VALUES('e2e-admin',?,'Test Admin',?,'admin')",
    args: [adminEmail, hashPassword(password)],
  });
  c.close();
});
test('all public pages render and catalog filters find the right pieces', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Tu identidad. Tu propia firma.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page
    .getByRole('link', { name: 'EXPLORAR LA COLECCIÓN', exact: true })
    .click();
  await page.getByRole('button', { name: 'Vestidos', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(
    page.getByRole('heading', { name: 'Vestido Silhouette' }),
  ).toBeVisible();
  for (const url of [
    '/manifiesto',
    '/journal',
    '/journal/vestir-sin-permiso',
    '/ayuda',
    '/guia-tallas',
    '/politicas/privacidad',
    '/contacto',
    '/co-creacion',
    '/comunidad',
  ]) {
    const r = await page.goto(url);
    expect(r?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  const missing = await page.goto('/no-existe');
  expect(missing?.status()).toBe(404);
});
test('product selection, persisted cart, checkout, and protected receipt work end to end', async ({
  page,
  request,
}) => {
  await page.goto('/producto/blazer-noir');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page
    .getByRole('button', { name: 'Ampliar imagen de la pieza' })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ampliar imagen de la pieza' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'AÑADIR A MI SELECCIÓN' }).click();
  await expect(page.getByRole('status')).toContainText('Selecciona una talla');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'AÑADIR A MI SELECCIÓN' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'Ver mi selección' }).click();
  await page.waitForURL('**/carrito');
  await page.reload();
  await expect(page.getByText('Blazer Noir', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'CONTINUAR AL CHECKOUT' }).click();
  await page
    .getByLabel('Correo electrónico', { exact: true })
    .fill('preview-test@example.com');
  await page.getByLabel('Nombre completo').fill('Test Preview');
  await page
    .getByLabel('Dirección', { exact: true })
    .fill('Dirección ficticia 123');
  await page.getByLabel('Ciudad / municipio').fill('Bogotá');
  await page.getByLabel('Código postal').fill('110111');
  await page.locator('input[type=checkbox]').check();
  await page
    .getByRole('button', { name: 'CONFIRMAR PEDIDO DE PRUEBA' })
    .click();
  await page.waitForURL(/\/pedido\//);
  await expect(
    page.getByText('Tu pedido de prueba se ha guardado correctamente.', {
      exact: false,
    }),
  ).toBeVisible();
  const receiptUrl = page.url();
  const id = new URL(receiptUrl).pathname.split('/').pop();
  const denied = await request.get('/api/orders/' + id);
  expect(denied.status()).toBe(404);
  await page.goto('/carrito');
  await expect(
    page.getByRole('heading', { name: 'Un lienzo en blanco.' }),
  ).toBeVisible();
  await page.goto('/producto/top-lumiere');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'AÑADIR A MI SELECCIÓN' }).click();
  await page.getByRole('link', { name: 'Ver mi selección' }).click();
  await page.goto(receiptUrl);
  await expect(
    page.getByText('Tu pedido de prueba se ha guardado correctamente.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto('/carrito');
  await expect(page.getByText('Top Lumière', { exact: true })).toBeVisible();
});
test('landing studio selection carries the chosen silhouette into the configurator', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'Explorar silueta Top' }).click();
  await expect(
    page.getByRole('button', { name: 'Explorar silueta Top' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'ABRIR MI DESIGN STUDIO' }).click();
  await expect(
    page.getByRole('button', { name: 'Vista de Top' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.creator-details')).toContainText('TOP');
  await page.getByRole('button', { name: 'Vista de Pantalón' }).click();
  await expect(page.locator('.creator-details')).toContainText('PANTALÓN');
});
test('identity quiz completes four questions with deterministic recommendations', async ({
  page,
}) => {
  await page.goto('/identidad');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'COMENZAR MI HISTORIA' }).click();
  for (let i = 0; i < 4; i++)
    await page.locator('.quiz-options button').first().click();
  await expect(
    page.getByRole('heading', { name: 'La esencia minimalista.' }),
  ).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(4);
});
test('registration, favorites, private and public design specifications persist', async ({
  page,
}) => {
  const email = 'creator-' + crypto.randomUUID() + '@example.com';
  await page.goto('/cuenta');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByLabel('Tu nombre', { exact: true }).fill('Test Creator');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña · mínimo 10 caracteres').fill(password);
  await page.locator('.form-card input[type=checkbox]').check();
  await page.getByRole('button', { name: 'CREAR MI CUENTA' }).click();
  await expect(
    page.getByRole('heading', { name: 'Hola, Test.' }),
  ).toBeVisible();
  await page.goto('/producto/top-lumiere');
  await page
    .getByRole('button', { name: 'Guardar en favoritos', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Guardado');
  await page.goto('/co-creacion');
  await page.getByRole('button', { name: 'CONTINUAR CON MATERIAL' }).click();
  await page.getByRole('button', { name: 'CONTINUAR CON COLOR' }).click();
  await page.getByRole('button', { name: 'CONTINUAR CON DETALLES' }).click();
  await page
    .getByLabel('Dale un nombre a tu creación')
    .fill('Mi identidad de prueba');
  await page.getByRole('button', { name: 'GUARDAR MI CREACIÓN' }).click();
  await expect(
    page.getByRole('button', { name: 'PROPUESTA GUARDADA' }),
  ).toBeVisible();
  await page.goto('/cuenta');
  await page.getByRole('button', { name: 'Mis creaciones' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mi identidad de prueba' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mis favoritos' }).click();
  await expect(
    page.getByRole('heading', { name: 'Top Lumière' }),
  ).toBeVisible();
  const denied = await page.request.get('/api/admin');
  expect(denied.status()).toBe(403);
});
test('server enforces consent, origin, prices, idempotency, and receipt access', async ({
  request,
}) => {
  expect(
    (
      await request.post('/api/leads', {
        data: {
          email: 'no-consent@example.com',
          consent: true,
          source: 'newsletter',
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await post(request, 'leads', {
        email: 'no-consent@example.com',
        consent: false,
        source: 'newsletter',
      })
    ).status(),
  ).toBe(400);
  const input = {
    email: 'idempotent@example.com',
    name: 'Test Customer',
    address: 'Fake test street 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
    items: [
      { productId: 'p-noir', size: 'M', color: 'Noir', quantity: 1, price: 1 },
    ],
    idempotencyKey: crypto.randomUUID(),
    accepted: true,
  };
  const [a, b] = await Promise.all([
    post(request, 'checkout', input),
    post(request, 'checkout', input),
  ]);
  expect(a.status()).toBe(200);
  expect(b.status()).toBe(200);
  const order = await a.json();
  expect((await b.json()).orderId).toBe(order.orderId);
  const receipt = await request.get(
    '/api/orders/' +
      order.orderId +
      '?token=' +
      new URL('http://localhost:3000' + order.url).searchParams.get('token'),
  );
  expect((await receipt.json()).order.total).toBe(129000000);
  const changed = await post(request, 'checkout', {
    ...input,
    name: 'Different User',
  });
  expect(changed.status()).toBe(409);
  const unknown = await post(request, 'checkout', {
    ...input,
    idempotencyKey: crypto.randomUUID(),
    items: [{ ...input.items[0], productId: 'unknown' }],
  });
  expect(unknown.status()).toBe(400);
  expect(
    (await request.post('/api/webhooks/wompi', { data: {} })).status(),
  ).toBe(503);
});
test('moderation, roles, customer messages, CMS, and operational status rules work', async ({
  request,
}) => {
  const suffix = crypto.randomUUID();
  const storyTitle = 'Test story ' + suffix;
  const email = 'moderation-' + suffix + '@example.com';
  await post(request, 'auth/register', {
    name: 'Test Story Author',
    email,
    password,
  });
  const submitted = await post(request, 'posts', {
    title: storyTitle,
    body: 'An original test story about personal expression.',
    category: 'Historias',
  });
  expect(submitted.status()).toBe(201);
  const publicBefore = await request.get('/api/community');
  expect(
    (await publicBefore.json()).posts.some((p: any) => p.title === storyTitle),
  ).toBe(false);
  await post(request, 'contact', {
    name: 'Test Contact',
    email,
    subject: 'Información general',
    message: 'A test message for the atelier administrator.',
    consent: true,
  });
  await post(request, 'auth/logout', {});
  expect(
    (
      await post(request, 'auth/login', { email: adminEmail, password })
    ).status(),
  ).toBe(200);
  const state = await (await request.get('/api/admin')).json();
  const pending = state.posts.find(
    (p: any) => p.title === storyTitle && p.status === 'pending',
  );
  expect(pending).toBeTruthy();
  expect(
    (
      await post(request, 'admin/moderate', {
        id: pending.id,
        type: 'posts',
        status: 'published',
      })
    ).status(),
  ).toBe(200);
  const publicAfter = await request.get('/api/community');
  expect(
    (await publicAfter.json()).posts.some((p: any) => p.id === pending.id),
  ).toBe(true);
  expect(state.contacts.some((m: any) => m.email === email)).toBe(true);
  expect(
    (
      await post(request, 'admin/content', {
        key: 'home_intro',
        value: 'A verified editorial introduction for the test environment.',
      })
    ).status(),
  ).toBe(200);
  await post(request, 'admin/content', {
    key: 'home_intro',
    value:
      'No te vistas para encajar. Vístete para expresar quién eres. Descubre piezas con carácter, creadas para contar tu historia.',
  });
  expect(
    (
      await post(request, 'admin/role', { id: state.user.id, role: 'customer' })
    ).status(),
  ).toBe(409);
  const preview = state.orders.find((o: any) => o.status === 'preview');
  expect(
    (
      await post(request, 'admin/order', { id: preview.id, status: 'shipped' })
    ).status(),
  ).toBe(409);
});
test('no horizontal overflow at all required viewport widths and primary images load', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      '/',
      '/colecciones',
      '/producto/blazer-noir',
      '/co-creacion',
      '/cuenta',
      '/comunidad',
      '/universo',
      '/probador-virtual',
    ]) {
      await page.goto(url);
      await page.waitForTimeout(100);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        url + ' at ' + width,
      ).toBe(true);
    }
  }
  await page.goto('/');
  await expect(page.locator('.hero img')).toBeVisible();
  expect(
    await page
      .locator('.hero img')
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 750) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  const editorialImages = page.locator('main img:visible');
  for (let i = 0; i < (await editorialImages.count()); i++) {
    const img = editorialImages.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        img.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  });
});
test('landing and key forms pass automated accessibility checks and cart traps focus', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  for (const url of [
    '/',
    '/cuenta',
    '/contacto',
    '/identidad',
    '/colecciones',
    '/producto/blazer-noir',
    '/universo',
    '/probador-virtual',
  ]) {
    await page.goto(url);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await page.goto('/producto/blazer-noir');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'AÑADIR A MI SELECCIÓN' }).click();
  await page.keyboard.press('Shift+Tab');
  expect(
    await page.evaluate(
      () => document.activeElement?.closest('.cart-drawer') !== null,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('signed payment webhooks settle once, reject wrong totals, and release inventory once', async ({
  request,
}) => {
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe('sk_test_fixture_not_real');
  const c = createClient({
    url:
      process.env.ATELIER_E2E_DB_URL || 'file:' + path.resolve('.data/e2e.db'),
  });
  const items = [
    {
      productId: 'p-noir',
      size: 'M',
      color: 'Noir',
      quantity: 1,
      name: 'Blazer Noir',
      price: 129000000,
      image: '/images/blazer.webp',
    },
  ];
  async function seed(total: number) {
    const id = crypto.randomUUID();
    await c.execute({
      sql: "INSERT INTO orders(id,email,name,address,city,postal,country,items,subtotal,shipping,total,status,idempotency_key,request_hash,access_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?)",
      args: [
        id,
        'payment-test@example.com',
        'Payment Test',
        'Test address 123',
        'Bogotá',
        '110111',
        'CO',
        JSON.stringify(items),
        total,
        0,
        total,
        crypto.randomUUID(),
        'test-hash',
        crypto.randomUUID(),
      ],
    });
    return id;
  }
  async function webhook(
    id: string,
    type: string,
    orderId: string,
    amount = 129000000,
  ) {
    const payload = JSON.stringify({
      id,
      type,
      object: 'event',
      data: {
        object: {
          id: 'cs_' + orderId,
          payment_status: 'paid',
          metadata: { orderId },
          amount_total: amount,
          currency: 'cop',
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_test_fixture_not_real',
    });
    return request.post('/api/webhooks/stripe', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
    });
  }
  const paid = await seed(129000000);
  const event = 'evt_' + crypto.randomUUID();
  expect(
    (await webhook(event, 'checkout.session.completed', paid)).status(),
  ).toBe(200);
  expect(
    (await webhook(event, 'checkout.session.completed', paid)).status(),
  ).toBe(200);
  expect(
    (
      await c.execute({
        sql: 'SELECT status FROM orders WHERE id=?',
        args: [paid],
      })
    ).rows[0].status,
  ).toBe('paid');
  expect(
    Number(
      (
        await c.execute({
          sql: 'SELECT COUNT(*) count FROM webhook_events WHERE id=?',
          args: [event],
        })
      ).rows[0].count,
    ),
  ).toBe(1);
  const wrong = await seed(129000000);
  expect(
    (
      await webhook(
        'evt_' + crypto.randomUUID(),
        'checkout.session.completed',
        wrong,
        1,
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await c.execute({
        sql: 'SELECT status FROM orders WHERE id=?',
        args: [wrong],
      })
    ).rows[0].status,
  ).toBe('pending');
  const expired = await seed(129000000);
  const stock = Number(
    (
      await c.execute(
        "SELECT stock FROM variants WHERE product_id='p-noir' AND size='M' AND color='Noir'",
      )
    ).rows[0].stock,
  );
  await c.execute(
    "UPDATE variants SET stock=stock-1 WHERE product_id='p-noir' AND size='M' AND color='Noir'",
  );
  const expireEvent = 'evt_' + crypto.randomUUID();
  expect(
    (await webhook(expireEvent, 'checkout.session.expired', expired)).status(),
  ).toBe(200);
  expect(
    (await webhook(expireEvent, 'checkout.session.expired', expired)).status(),
  ).toBe(200);
  expect(
    Number(
      (
        await c.execute(
          "SELECT stock FROM variants WHERE product_id='p-noir' AND size='M' AND color='Noir'",
        )
      ).rows[0].stock,
    ),
  ).toBe(stock);
  expect(
    (
      await request.post('/api/webhooks/stripe', {
        data: {},
        headers: { 'stripe-signature': 'invalid' },
      })
    ).status(),
  ).toBe(400);
  c.close();
});

test('administrator UI exposes role-protected inventory, content, messages and metrics', async ({
  page,
}) => {
  await page.goto('/cuenta');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill(adminEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'ENTRAR A MI ATELIER' }).click();
  await page.getByRole('link', { name: 'Administración' }).click();
  await expect(
    page.getByRole('heading', { name: 'Detrás de cada historia.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Catálogo', exact: true }).click();
  await expect(page.locator('.admin-table tbody tr')).toHaveCount(18);
  await page.getByRole('button', { name: 'Editar pieza' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByText('Inventario por talla y color', { exact: true }).click();
  await expect(page.getByLabel('Stock M Noir', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const newPiece = page
    .locator('.admin-table tbody tr')
    .filter({ hasText: 'Gabardina Pluie' });
  await newPiece.getByRole('button', { name: 'Editar pieza' }).click();
  await expect(page.getByLabel('Categoría', { exact: true })).toHaveValue(
    'Abrigos',
  );
  await expect(
    page.getByLabel('Imagen de la biblioteca', { exact: true }),
  ).toHaveValue('/images/garments/gabardina-pluie.webp');
  await page.keyboard.press('Escape');
  const adminState = await (await page.request.get('/api/admin')).json();
  const garment = adminState.products.find(
    (p: any) => p.slug === 'gabardina-pluie',
  );
  const updated = await post(page.request, 'admin/product', {
    ...garment,
    stock: garment.stock + 1,
  });
  expect(updated.status()).toBe(200);
  const inventory = await (
    await page.request.get('/api/admin/variants?id=' + garment.id)
  ).json();
  expect(inventory.variants).toHaveLength(5);
  expect(
    inventory.variants.every(
      (v: any) => v.color === 'Ivory' && v.stock === garment.stock + 1,
    ),
  ).toBe(true);
  expect((await post(page.request, 'admin/product', garment)).status()).toBe(
    200,
  );
  await page.getByRole('button', { name: 'Mensajes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Conversaciones del atelier.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Contenidos', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'La voz de la maison.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Las personas detrás del atelier.' }),
  ).toBeVisible();
});

test('worn gallery preserves angles across colors, zoom follows the pointer, and selected size/color reach the basket', async ({
  page,
}) => {
  await page.goto('/producto/blazer-noir');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  const image = page.locator('.fit-main-image:visible');
  await expect(image).toHaveAttribute('alt', /Noir.*frente.*en modelo/);
  await page
    .getByRole('button', { name: 'Ver vista Perfil', exact: true })
    .click();
  await expect(image).toHaveAttribute('alt', /perfil/);
  await page.getByRole('button', { name: 'Color Ivory', exact: true }).click();
  await expect(image).toHaveAttribute('alt', /Ivory.*perfil/);
  await page
    .getByRole('button', { name: 'Ver vista Espalda', exact: true })
    .click();
  await expect(image).toHaveAttribute('alt', /Ivory.*espalda/);
  await page.getByRole('button', { name: 'L', exact: true }).click();
  await expect(page.locator('.fit-measurements')).toContainText('Ivory / L');
  await expect(page.locator('.fit-measurements')).toContainText('94–100');
  await page
    .locator('.fit-main:visible')
    .hover({ position: { x: 90, y: 170 } });
  await expect(page.locator('.fit-main:visible')).toHaveClass(/is-hovering/);
  await expect
    .poll(() => image.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  const origin = await image.evaluate(
    (el) => (el as HTMLElement).style.transformOrigin,
  );
  await page
    .locator('.fit-main:visible')
    .hover({ position: { x: 180, y: 300 } });
  expect(
    await image.evaluate((el) => (el as HTMLElement).style.transformOrigin),
  ).not.toBe(origin);
  await page.getByRole('heading', { name: 'Blazer Noir', exact: true }).hover();
  await expect(page.locator('.fit-main:visible')).not.toHaveClass(
    /is-hovering/,
  );
  await page
    .getByRole('button', { name: 'Ampliar imagen de la pieza' })
    .click();
  await page.getByRole('button', { name: 'Aumentar zoom' }).click();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await expect(page.getByRole('dialog')).toContainText('150%');
  await page
    .getByRole('button', { name: 'Parte superior', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Vista siguiente', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Frente · Ivory');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Ampliar imagen de la pieza' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'AÑADIR A MI SELECCIÓN' }).click();
  await page.getByRole('link', { name: 'Ver mi selección' }).click();
  await expect(page.locator('.cart-row').first()).toContainText('Ivory');
  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('atelier-cart') || '[]'),
  );
  expect(cart[0]).toMatchObject({
    size: 'L',
    color: 'Ivory',
    image: '/images/products/blazer-noir/ivory-front.webp',
  });
});

test('store color previews and garment-only toggle retain the selected variant', async ({
  page,
  request,
}) => {
  await page.goto('/colecciones');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'La pieza', exact: true }).click();
  const first = page.locator('.product-card').first();
  await expect(first.locator('.product-image img')).toHaveAttribute(
    'alt',
    /Noir/,
  );
  await page.getByRole('button', { name: 'En modelo', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ver Blazer Noir en Taupe', exact: true })
    .click();
  await expect(first.locator('.product-image img')).toHaveAttribute(
    'alt',
    /Taupe.*en modelo/,
  );
  await first
    .getByRole('link', { name: 'Ver Blazer Noir', exact: true })
    .click();
  await expect(page.locator('.fit-main-image:visible')).toHaveAttribute(
    'alt',
    /Taupe/,
  );
  for (const product of products) {
    const slug = product.slug;
    for (const name of productColors(product)) {
      const color = name.toLowerCase();
      for (const angle of ['front', 'side', 'back']) {
        const response = await request.get(
          `/images/products/${slug}/${color}-${angle}.webp`,
        );
        expect(response.status(), `${slug}/${color}-${angle}`).toBe(200);
        expect(response.headers()['content-type']).toContain('image/webp');
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Ampliar imagen de la pieza' })
    .click();
  await page.getByRole('button', { name: 'Aumentar zoom' }).click();
  await page
    .getByRole('button', { name: 'Parte inferior', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('150%');
  await page.getByRole('button', { name: 'Cerrar imagen ampliada' }).click();
});
