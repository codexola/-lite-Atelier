import { z } from 'zod';
export const checkoutSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(100),
  postal: z.string().trim().min(2).max(20),
  country: z.enum(['CO']),
  items: z
    .array(
      z.object({
        productId: z.string().max(80),
        size: z.enum(['XS', 'S', 'M', 'L', 'XL']),
        color: z.enum(['Noir', 'Ivory', 'Taupe']),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(30),
  idempotencyKey: z.uuid(),
  accepted: z.literal(true),
});
export function shippingCost(
  subtotal: number,
  config = { fee: 2500000, freeAt: 120000000 },
) {
  return subtotal >= config.freeAt ? 0 : config.fee;
}
export function styleResult(answers: number[]) {
  if (
    answers.length !== 4 ||
    answers.some((n) => !Number.isInteger(n) || n < 0 || n > 2)
  )
    throw new Error('Responde las cuatro preguntas.');
  const counts = [0, 0, 0];
  answers.forEach((n) => counts[n]++);
  return counts.indexOf(Math.max(...counts));
}
export function orderTransition(current: string, next: string) {
  const transitions: Record<string, string[]> = {
    preview: ['cancelled'],
    pending: ['cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
    expired: [],
  };
  return transitions[current]?.includes(next) ?? false;
}
