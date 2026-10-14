import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from './http';
const transactionSchema = z.object({
  id: z.string().min(1).max(200),
  status: z.enum(['APPROVED', 'DECLINED', 'VOIDED', 'ERROR', 'PENDING']),
  reference: z.string().uuid(),
  amount_in_cents: z.number().int().positive(),
  currency: z.literal('COP'),
});
export function verifyWompiSignature(event: any, secret: string) {
  const props = event.signature?.properties;
  const required = [
    'transaction.id',
    'transaction.status',
    'transaction.amount_in_cents',
  ];
  if (
    !Array.isArray(props) ||
    props.length > 20 ||
    !required.every((p) => props.includes(p)) ||
    props.some(
      (p) => typeof p !== 'string' || !/^transaction\.[a-z_]+$/.test(p),
    ) ||
    typeof event.signature?.checksum !== 'string' ||
    !Number.isSafeInteger(event.timestamp)
  )
    throw new HttpError(400, 'Firma requerida.');
  const signed =
    props
      .map((p: string) =>
        p.split('.').reduce((v: any, k: string) => v?.[k], event.data),
      )
      .join('') +
    event.timestamp +
    secret;
  const expected = Buffer.from(
    createHash('sha256').update(signed).digest('hex'),
  );
  const actual = Buffer.from(event.signature.checksum.toLowerCase());
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new HttpError(400, 'Firma inválida.');
  return transactionSchema.parse(event.data?.transaction);
}
export async function authoritativeWompiTransaction(
  id: string,
  publicKey: string,
  fetcher: typeof fetch = fetch,
) {
  const base = publicKey.startsWith('pub_test_')
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1';
  const res = await fetcher(base + '/transactions/' + encodeURIComponent(id), {
    headers: { Authorization: 'Bearer ' + publicKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new HttpError(503, 'No pudimos verificar la transacción con Wompi.');
  const result = await res.json();
  return transactionSchema.parse(result.data);
}
