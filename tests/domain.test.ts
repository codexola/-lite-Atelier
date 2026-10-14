import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shippingCost,
  styleResult,
  checkoutSchema,
  orderTransition,
} from '../src/lib/domain';
import { hashPassword, verifyPassword } from '../src/lib/password';
test('Colombian shipping threshold and integer centavos', () => {
  assert.equal(shippingCost(119999999), 2500000);
  assert.equal(shippingCost(120000000), 0);
});
test('style recommendation is deterministic with ties and rejects incomplete answers', () => {
  assert.equal(styleResult([0, 1, 0, 1]), 0);
  assert.equal(styleResult([2, 2, 1, 2]), 2);
  assert.throws(() => styleResult([1, 2]));
  assert.throws(() => styleResult([0, 0, 0, 3]));
});
test('checkout rejects foreign countries, impossible quantities, and missing acceptance', () => {
  const valid = {
    email: 'test@example.com',
    name: 'Test User',
    address: 'Test street 123',
    city: 'Bogotá',
    postal: '110111',
    country: 'CO',
    items: [{ productId: 'p-noir', size: 'M', color: 'Noir', quantity: 1 }],
    idempotencyKey: crypto.randomUUID(),
    accepted: true,
  };
  assert.ok(checkoutSchema.safeParse(valid).success);
  assert.equal(
    checkoutSchema.safeParse({ ...valid, country: 'US' }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({ ...valid, accepted: false }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...valid,
      items: [{ ...valid.items[0], quantity: 0 }],
    }).success,
    false,
  );
});
test('orders cannot be marked paid by operators or move backwards', () => {
  assert.equal(orderTransition('pending', 'paid'), false);
  assert.equal(orderTransition('paid', 'processing'), true);
  assert.equal(orderTransition('shipped', 'delivered'), true);
  assert.equal(orderTransition('delivered', 'processing'), false);
});
test('passwords are salted and checked without accepting a wrong password', () => {
  const a = hashPassword('test-only-strong-pass');
  const b = hashPassword('test-only-strong-pass');
  assert.notEqual(a, b);
  assert.ok(verifyPassword('test-only-strong-pass', a));
  assert.equal(verifyPassword('wrong', a), false);
});

import { createHash } from 'node:crypto';
import {
  verifyWompiSignature,
  authoritativeWompiTransaction,
} from '../src/lib/wompi';
test('Wompi rejects tampering and requires all payment-critical signed fields', () => {
  const transaction = {
    id: 'txn-test',
    status: 'APPROVED',
    reference: crypto.randomUUID(),
    amount_in_cents: 129000000,
    currency: 'COP',
  };
  const timestamp = 1700000000;
  const properties = [
    'transaction.id',
    'transaction.status',
    'transaction.amount_in_cents',
  ];
  const secret = 'test-only-event-secret';
  const checksum = createHash('sha256')
    .update(
      transaction.id +
        transaction.status +
        transaction.amount_in_cents +
        timestamp +
        secret,
    )
    .digest('hex');
  const event = {
    data: { transaction },
    timestamp,
    signature: { properties, checksum },
  };
  assert.equal(verifyWompiSignature(event, secret).id, 'txn-test');
  assert.throws(() =>
    verifyWompiSignature(
      {
        ...event,
        data: { transaction: { ...transaction, amount_in_cents: 1 } },
      },
      secret,
    ),
  );
  assert.throws(() =>
    verifyWompiSignature(
      { ...event, signature: { properties: ['transaction.id'], checksum } },
      secret,
    ),
  );
});
test('Wompi order reference is fetched from the authoritative API, not unsigned webhook fields', async () => {
  const actualReference = crypto.randomUUID();
  let requested = '';
  const mockedFetch = (async (url: RequestInfo | URL) => {
    requested = String(url);
    return new Response(
      JSON.stringify({
        data: {
          id: 'txn-safe',
          status: 'APPROVED',
          reference: actualReference,
          amount_in_cents: 129000000,
          currency: 'COP',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
  const result = await authoritativeWompiTransaction(
    'txn-safe',
    'pub_test_fixture',
    mockedFetch,
  );
  assert.equal(requested, 'https://sandbox.wompi.co/v1/transactions/txn-safe');
  assert.equal(result.reference, actualReference);
});

test('all 18 garments have front, side, back and transparent camera assets for their actual colors; custom photos keep their own reference', async () => {
  const { products } = await import('../src/lib/catalog');
  const { productColors, garmentAsset } =
    await import('../src/lib/garment-assets');
  const { productMedia, wornImage } = await import('../src/lib/product-media');
  const { existsSync } = await import('node:fs');
  assert.equal(products.length, 18);
  let views = 0;
  let cutouts = 0;
  const sharp = (await import('sharp')).default;
  for (const product of products) {
    assert.ok(productMedia(product));
    for (const color of productColors(product)) {
      const asset = garmentAsset(product, color);
      assert.ok(asset);
      assert.ok(existsSync('public' + asset), asset);
      const { data, info } = await sharp('public' + asset)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphas = Array.from(
        { length: info.width * info.height },
        (_, i) => data[i * 4 + 3],
      );
      assert.ok(
        alphas.some((a) => a === 0),
        `${asset} needs transparent background`,
      );
      assert.ok(
        alphas.some((a) => a > 240),
        `${asset} needs a visible garment`,
      );
      cutouts++;
      for (const angle of ['front', 'side', 'back']) {
        assert.ok(
          existsSync('public' + wornImage(product, color, angle)),
          `${product.slug} ${color} ${angle}`,
        );
        views++;
      }
    }
  }
  assert.equal(views, 90);
  assert.equal(cutouts, 30);
  const custom = {
    ...products[0],
    image: '/images/custom-approved-product.webp',
  };
  assert.equal(productMedia(custom), null);
  assert.equal(wornImage(custom, 'Ivory'), custom.image);
  assert.equal(garmentAsset(custom, 'Ivory'), null);
  assert.equal(garmentAsset(products[0], '../invalid'), null);
});

test('body fitting follows shoulders, hips and arms and rejects hidden or invalid joints', async () => {
  const { fitGrid } = await import('../src/lib/camera-fitting');
  const body = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
  }));
  for (const [i, x, y] of [
    [11, 0.35, 0.2],
    [12, 0.65, 0.2],
    [13, 0.3, 0.4],
    [14, 0.7, 0.4],
    [15, 0.3, 0.55],
    [16, 0.7, 0.55],
    [23, 0.4, 0.55],
    [24, 0.6, 0.55],
    [25, 0.4, 0.75],
    [26, 0.6, 0.75],
    [27, 0.4, 0.95],
    [28, 0.6, 0.95],
  ])
    body[i] = { x, y, visibility: 1 };
  const initial = fitGrid(body, 640, 960, 'upper', true)!;
  const moved = fitGrid(
    body.map((p) => ({ ...p, x: p.x + 0.05 })),
    640,
    960,
    'upper',
    true,
  )!;
  assert.ok(Math.abs(moved[0][2].x - initial[0][2].x - 32) < 0.001);
  assert.ok(fitGrid(body, 640, 960, 'lower', false));
  assert.ok(fitGrid(body, 640, 960, 'dress', false));
  assert.ok(fitGrid(body, 640, 960, 'full', false));
  const skirt = fitGrid(body, 640, 960, 'skirt', false)!;
  assert.ok(skirt[3][2].y < fitGrid(body, 640, 960, 'lower', false)![3][2].y);
  assert.equal(fitGrid([], 640, 960, 'lower', false), null);
  assert.equal(fitGrid(body, 0, 960, 'upper', true), null);
  assert.equal(fitGrid(body, 640, 960, 'upper', true, NaN), null);
  assert.equal(
    fitGrid(
      body.map((p, i) => (i === 27 ? { ...p, visibility: 0 } : p)),
      640,
      960,
      'full',
      false,
    ),
    null,
  );
  assert.equal(
    fitGrid(
      body.map((p, i) => (i === 11 ? { ...p, x: NaN } : p)),
      640,
      960,
      'upper',
      true,
    ),
    null,
  );
});
