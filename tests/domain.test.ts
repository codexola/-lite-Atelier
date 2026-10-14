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
