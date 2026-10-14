import { test, expect, type APIRequestContext } from '@playwright/test';
import { createClient } from '@libsql/client';
import { hashPassword } from '../src/lib/password';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
const headers = { Origin: 'http://localhost:3000' };
const password = 'operations-fixture-pass-12345';
const c = createClient({
  url: process.env.ATELIER_E2E_DB_URL || 'file:' + path.resolve('.data/e2e.db'),
});
async function post(r: APIRequestContext, key: string, data: unknown) {
  return r.post('/api/' + key, { headers, data });
}
async function staff(r: APIRequestContext, role = 'admin') {
  const res = await post(r, 'staff/login', {
    email: 'operations-' + role + '@example.com',
    password,
  });
  expect(res.status()).toBe(200);
}
test.beforeAll(async () => {
  for (const role of ['admin', 'editor', 'operator', 'customer'])
    await c.execute({
      sql: 'INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET password=excluded.password,role=excluded.role',
      args: [
        'ops-' + role,
        'operations-' + role + '@example.com',
        'Operations ' + role,
        hashPassword(password),
        role,
      ],
    });
});
test.afterAll(() => c.close());
test('staff bootstrap and sessions are separate, permissions use live roles', async ({
  request,
  playwright,
}) => {
  expect(
    (
      await post(request, 'staff/login', {
        email: 'bootstrap-test@example.com',
        password: 'bootstrap-test-pass-12345',
      })
    ).status(),
  ).toBe(200);
  expect((await (await request.get('/api/me')).json()).user).toBeNull();
  expect((await request.get('/api/admin/operations')).status()).toBe(200);
  await post(request, 'staff/logout', {});
  expect(
    (
      await post(request, 'auth/login', {
        email: 'operations-admin@example.com',
        password,
      })
    ).status(),
  ).toBe(200);
  expect((await request.get('/api/admin')).status()).toBe(401);
  const editor = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  });
  await staff(editor, 'editor');
  expect((await editor.get('/api/admin/report')).status()).toBe(403);
  expect(
    (
      await post(editor, 'admin/staff', {
        email: 'forbidden@example.com',
        name: 'Forbidden',
        password,
        role: 'admin',
      })
    ).status(),
  ).toBe(403);
  expect((await editor.get('/api/admin/operations')).status()).toBe(200);
  const op = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  });
  await staff(op, 'operator');
  expect((await post(op, 'admin/catalog', {})).status()).toBe(403);
  expect(
    (
      await post(op, 'admin/shipping', {
        name: 'Fixture destination',
        country: 'ZZ',
        fee: 10000,
        freeAt: 10000000,
        estimate: 'Prueba de tarifas',
        active: true,
      })
    ).status(),
  ).toBe(200);
  await editor.dispose();
  await op.dispose();
});
test('uploaded media, custom categories, variants and authoritative checkout persist without code changes', async ({
  page,
  request,
}) => {
  await staff(request);
  const suffix = crypto.randomUUID().slice(0, 8),
    category = 'Categoría ' + suffix;
  const tax = await post(request, 'admin/taxonomy', {
    kind: 'category',
    name: category,
    slug: 'test-' + suffix,
  });
  expect(tax.status()).toBe(200);
  const tid = (await tax.json()).id;
  const upload = await request.post('/api/admin/media', {
    headers,
    multipart: {
      file: {
        name: 'product.webp',
        mimeType: 'image/webp',
        buffer: await (
          await import('node:fs/promises')
        ).readFile('public/images/blazer.webp'),
      },
    },
  });
  expect(upload.status()).toBe(201);
  const media = await upload.json();
  const photo = await request.get(media.src);
  expect(photo.headers()['content-type']).toBe('image/webp');
  expect((await photo.body()).length).toBeGreaterThan(1000);
  const id = crypto.randomUUID(),
    piece = {
      id,
      slug: 'custom-' + suffix,
      name: 'Custom Test ' + suffix,
      category,
      collection: 'Signature',
      price: 10000000,
      image: media.src,
      description:
        'Una pieza de prueba con fotografía propia y tallas personalizadas.',
      material: 'Material de prueba',
      fit: 'Ajuste de prueba',
      sku: 'TEST-' + suffix,
      weight: 500,
      active: true,
      featured: false,
      approved: false,
      colors: [{ name: 'Azul', hex: '#233a70' }],
      variants: [
        { size: '36', color: 'Azul', stock: 3, price: 15000000 },
        { size: '38', color: 'Azul', stock: 4, price: null },
      ],
      gallery: [
        {
          src: media.src,
          label: 'Vista frontal',
          angle: 'front',
          color: 'Azul',
        },
      ],
    };
  const saved = await post(request, 'admin/catalog', piece);
  expect(saved.status(), await saved.text()).toBe(200);
  const state = await (await request.get('/api/admin')).json();
  const found = state.products.find((p: any) => p.id === id);
  expect(found.sizeOptions).toEqual(['36', '38']);
  expect(found.gallery[0].src).toBe(media.src);
  await page.goto('/producto/' + piece.slug);
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await expect(
    page.getByRole('heading', { name: piece.name, exact: true }),
  ).toBeVisible();
  await page
    .locator('.fit-main:visible')
    .hover({ position: { x: 120, y: 230 } });
  await expect(page.locator('.fit-main:visible')).toHaveClass(/is-hovering/);
  await page.waitForTimeout(300);
  await expect(page.locator('.fit-main:visible')).toHaveClass(/is-hovering/);
  await page.getByRole('button', { name: '36', exact: true }).click();
  await expect(page.locator('.detail-price')).toContainText('150.000');

  const checkout = {
    email: 'operations-customer@example.com',
    name: 'Operations Customer',
    address: 'Calle de pruebas 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
    items: [{ productId: id, size: '36', color: 'Azul', quantity: 1 }],
    idempotencyKey: crypto.randomUUID(),
    accepted: true,
  };
  const order = await post(request, 'checkout', checkout);
  expect(order.status()).toBe(200);
  const receipt = await order.json();
  expect(
    Number(
      (
        await c.execute({
          sql: 'SELECT subtotal FROM orders WHERE id=?',
          args: [receipt.orderId],
        })
      ).rows[0].subtotal,
    ),
  ).toBe(15000000);
  expect(
    (
      await post(request, 'admin/taxonomy', {
        id: tid,
        kind: 'category',
        name: category,
        slug: 'test-' + suffix,
        active: false,
      })
    ).status(),
  ).toBe(409);
  expect((await post(request, 'admin/archive', { id })).status()).toBe(200);
  expect(
    (
      await post(request, 'admin/taxonomy', {
        id: tid,
        kind: 'category',
        name: category,
        slug: 'test-' + suffix,
        active: false,
      })
    ).status(),
  ).toBe(200);
});
test('discount quotes, preview usage and destination rules remain consistent', async ({
  request,
}) => {
  await staff(request);
  const code = 'TEST' + crypto.randomUUID().slice(0, 8).toUpperCase();
  expect(
    (
      await post(request, 'admin/discount', {
        code,
        type: 'percent',
        value: 10,
        minimum: 0,
        maximumUses: 2,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        active: true,
      })
    ).status(),
  ).toBe(200);
  const items = [
    { productId: 'p-lumiere', size: 'M', color: 'Ivory', quantity: 1 },
  ];
  const quote = await post(request, 'checkout/quote', {
    country: 'CO',
    items,
    discountCode: code,
  });
  expect(quote.status()).toBe(200);
  const q = await quote.json();
  expect(q.discount).toBe(7200000);
  expect(
    (await post(request, 'checkout/quote', { country: 'XX', items })).status(),
  ).toBe(400);
  const result = await post(request, 'checkout', {
    email: 'operations-customer@example.com',
    name: 'Operations Customer',
    address: 'Calle de pruebas 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
    items,
    discountCode: code,
    idempotencyKey: crypto.randomUUID(),
    accepted: true,
  });
  expect(result.status()).toBe(200);
  const o = await c.execute({
    sql: 'SELECT total FROM orders WHERE id=?',
    args: [(await result.json()).orderId],
  });
  expect(Number(o.rows[0].total)).toBe(q.total);
  expect(
    Number(
      (
        await c.execute({
          sql: 'SELECT uses FROM discounts WHERE code=?',
          args: [code],
        })
      ).rows[0].uses,
    ),
  ).toBe(0);
});
test('addresses, tracked fulfillment and full-order returns enforce ownership and prevent double restock', async ({
  request,
}) => {
  await post(request, 'auth/login', {
    email: 'operations-customer@example.com',
    password,
  });
  const a = await post(request, 'addresses', {
    label: 'Casa',
    name: 'Operations Customer',
    address: 'Calle de pruebas 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
  });
  expect(a.status()).toBe(200);
  const aid = (await a.json()).id;
  expect(
    (await (await request.get('/api/addresses')).json()).addresses.some(
      (a: any) => a.id === aid,
    ),
  ).toBe(true);
  const order = await post(request, 'checkout', {
    email: 'operations-customer@example.com',
    name: 'Operations Customer',
    address: 'Calle de pruebas 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
    items: [{ productId: 'p-lumiere', size: 'M', color: 'Ivory', quantity: 1 }],
    idempotencyKey: crypto.randomUUID(),
    accepted: true,
  });
  const oid = (await order.json()).orderId;
  await c.execute({
    sql: "UPDATE orders SET status='paid' WHERE id=?",
    args: [oid],
  }); // Isolated fixture, never a production settlement.
  const ret = await post(request, 'return/request', {
    orderId: oid,
    reason: 'Solicitud de devolución de prueba.',
  });
  expect(ret.status()).toBe(201);
  const rid = (await ret.json()).id;
  expect(
    (
      await post(request, 'return/request', {
        orderId: oid,
        reason: 'Solicitud repetida de prueba.',
      })
    ).status(),
  ).toBe(409);
  await staff(request);
  const shipment = {
    orderId: oid,
    carrier: 'Transportadora prueba',
    tracking: 'TEST123',
    url: 'https://example.com/tracking/TEST123',
    status: 'shipped',
    note: 'Fixture',
  };
  const ship = await post(request, 'admin/shipment', shipment);
  expect(ship.status(), await ship.text()).toBe(200);
  const receipt = await (await request.get('/api/orders/' + oid)).json();
  expect(receipt.order.shipment.tracking).toBe('TEST123');
  expect(
    (
      await post(request, 'admin/shipment', { ...shipment, status: 'prepared' })
    ).status(),
  ).toBe(409);
  expect(
    (
      await post(request, 'admin/return', {
        id: rid,
        status: 'approved',
        note: 'Aceptamos la devolución',
        amount: 72000000,
        restock: false,
      })
    ).status(),
  ).toBe(200);
  const old = Number(
    (
      await c.execute(
        "SELECT stock FROM variants WHERE product_id='p-lumiere' AND size='M' AND color='Ivory'",
      )
    ).rows[0].stock,
  );
  const received = {
    id: rid,
    status: 'received',
    note: 'Recibida y revisada',
    amount: 72000000,
    restock: true,
  };
  expect((await post(request, 'admin/return', received)).status()).toBe(200);
  expect((await post(request, 'admin/return', received)).status()).toBe(409);
  expect(
    Number(
      (
        await c.execute(
          "SELECT stock FROM variants WHERE product_id='p-lumiere' AND size='M' AND color='Ivory'",
        )
      ).rows[0].stock,
    ),
  ).toBe(old + 1);
  expect(
    (
      await post(request, 'admin/return', {
        id: rid,
        status: 'refund-requested',
        note: 'Conciliar en la pasarela',
        amount: 72000000,
        restock: false,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post(request, 'admin/refund-record', {
        id: rid,
        reference: 'fixture-manual-refund',
        note: 'Confirmado solo en prueba aislada',
        confirmed: true,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post(request, 'admin/refund-record', {
        id: rid,
        reference: 'fixture-manual-refund',
        note: 'Confirmado solo en prueba aislada',
        confirmed: true,
      })
    ).status(),
  ).toBe(409);
  await post(request, 'addresses/delete', { id: aid });
});
test('reports use all rows, exports neutralize spreadsheet formulas and email remains gated', async ({
  request,
}) => {
  await staff(request);
  await c.execute(
    "UPDATE users SET name='=HYPERLINK(unsafe)' WHERE id='ops-customer'",
  );
  const report = await (await request.get('/api/admin/report')).json();
  expect(Number(report.totals.orders)).toBeGreaterThan(0);
  expect(Number(report.inventory.variants)).toBeGreaterThanOrEqual(160);
  const csv = await request.get('/api/admin/export?kind=customers');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("'=HYPERLINK");
  const campaign = await post(request, 'admin/campaign', {
    title: 'Prueba de campaña',
    subject: 'Asunto de prueba',
    body: 'Solo una prueba, ningún email se envía.',
    segment: 'subscribers',
  });
  expect(campaign.status()).toBe(200);
  expect(
    (
      await post(request, 'admin/campaign-send', {
        id: (await campaign.json()).id,
        confirmed: true,
      })
    ).status(),
  ).toBe(503);
  await c.execute(
    "UPDATE users SET name='Operations customer' WHERE id='ops-customer'",
  );
});
test('modern staff pages remain usable on mobile and accessible', async ({
  page,
}) => {
  await staff(page.request);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/admin',
    '/admin/products',
    '/admin/taxonomy',
    '/admin/shipping',
    '/admin/promotions',
    '/admin/reports',
    '/admin/media',
    '/admin/security',
    '/admin/marketing',
    '/admin/returns',
    '/admin/customers',
    '/admin/creation',
  ]) {
    await page.goto(route);
    await expect(
      page.locator('.workspace-module,.workspace-welcome h1').first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
