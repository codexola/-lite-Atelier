import { createHash, randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { db } from './db';
import { checkoutSchema, shippingCost } from './domain';
import { HttpError, type User } from './auth';
import { sendMail } from './mail';
import { publicSettings } from './settings';
import type { z } from 'zod';
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export function liveCommerce() {
  return publicSettings().mode === 'live';
}
function appUrl() {
  const url = process.env.APP_URL;
  if (!url)
    throw new HttpError(503, 'Falta configurar la URL pública del sitio.');
  return url.replace(/\/$/, '');
}
export async function checkout(input: CheckoutInput, user: User | null) {
  const c = await db();
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  const tx = await c.transaction('write');
  let orderId = '';
  let token = '';
  let total = 0;
  let items: Record<string, unknown>[] = [];
  let existing = false;
  try {
    const previous = await tx.execute({
      sql: 'SELECT * FROM orders WHERE idempotency_key=?',
      args: [input.idempotencyKey],
    });
    if (previous.rows.length) {
      const p = previous.rows[0];
      if (p.request_hash !== fingerprint)
        throw new HttpError(
          409,
          'La solicitud de compra cambió. Vuelve a revisar tu carrito.',
        );
      orderId = String(p.id);
      token = String(p.access_token);
      total = Number(p.total);
      items = JSON.parse(String(p.items));
      existing = true;
      await tx.commit();
    } else {
      let subtotal = 0;
      const seen = new Set<string>();
      for (const item of input.items) {
        const key = `${item.productId}:${item.size}:${item.color}`;
        if (seen.has(key))
          throw new HttpError(
            400,
            'Combina las cantidades de una misma variante.',
          );
        seen.add(key);
        const result = await tx.execute({
          sql: 'SELECT p.*,v.stock AS variant_stock FROM products p JOIN variants v ON v.product_id=p.id WHERE p.id=? AND v.size=? AND v.color=? AND p.active=1',
          args: [item.productId, item.size, item.color],
        });
        const p = result.rows[0];
        if (!p) throw new HttpError(400, 'Una pieza ya no está disponible.');
        if (liveCommerce() && !p.approved)
          throw new HttpError(
            409,
            'Esta pieza conceptual aún no está disponible para venta.',
          );
        if (Number(p.variant_stock) < item.quantity)
          throw new HttpError(
            409,
            `No hay suficientes unidades de ${p.name} en esta variante.`,
          );
        subtotal += Number(p.price) * item.quantity;
        items.push({
          ...item,
          name: p.name,
          price: Number(p.price),
          image: p.image,
        });
        if (liveCommerce())
          await tx.execute({
            sql: 'UPDATE variants SET stock=stock-? WHERE product_id=? AND size=? AND color=? AND stock>=?',
            args: [
              item.quantity,
              item.productId,
              item.size,
              item.color,
              item.quantity,
            ],
          });
      }
      const shipping = shippingCost(subtotal, publicSettings().shipping);
      total = subtotal + shipping;
      orderId = crypto.randomUUID();
      token = randomBytes(24).toString('hex');
      await tx.execute({
        sql: 'INSERT INTO orders(id,user_id,email,name,address,city,postal,country,items,subtotal,shipping,total,status,idempotency_key,request_hash,access_token) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        args: [
          orderId,
          user?.id || null,
          input.email.toLowerCase(),
          input.name,
          input.address,
          input.city,
          input.postal,
          input.country,
          JSON.stringify(items),
          subtotal,
          shipping,
          total,
          liveCommerce() ? 'pending' : 'preview',
          input.idempotencyKey,
          fingerprint,
          token,
        ],
      });
      await tx.commit();
    }
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  const confirmation = `/pedido/${orderId}?token=${token}`;
  if (!liveCommerce()) {
    const email = !existing
      ? await sendMail(
          input.email,
          'Tu pedido de prueba · Élite Atelier',
          `Hemos registrado tu pedido de prueba ${orderId}. No se ha realizado ningún cobro ni envío. Puedes consultarlo en ${process.env.APP_URL || 'http://localhost:3000'}${confirmation}`,
        )
      : { sent: false };
    return { url: confirmation, orderId, emailSent: email.sent, preview: true };
  }
  const status = await c.execute({
    sql: 'SELECT status,stripe_id FROM orders WHERE id=?',
    args: [orderId],
  });
  if (status.rows[0]?.status !== 'pending')
    return { url: confirmation, orderId, preview: false };
  if (process.env.PAYMENT_PROVIDER !== 'stripe') {
    if (
      !process.env.WOMPI_PUBLIC_KEY ||
      !process.env.WOMPI_INTEGRITY_SECRET ||
      !process.env.WOMPI_EVENTS_SECRET
    ) {
      await releaseOrder(orderId, 'cancelled');
      throw new HttpError(
        503,
        'El pago Wompi aún no está configurado. No se ha realizado ningún cobro.',
      );
    }
    const signature = createHash('sha256')
      .update(orderId + total + 'COP' + process.env.WOMPI_INTEGRITY_SECRET)
      .digest('hex');
    const params = new URLSearchParams({
      'public-key': process.env.WOMPI_PUBLIC_KEY,
      currency: 'COP',
      'amount-in-cents': String(total),
      reference: orderId,
      'signature:integrity': signature,
      'redirect-url': appUrl() + confirmation,
      'customer-data:email': input.email,
      'customer-data:full-name': input.name,
    });
    return {
      url: `https://checkout.wompi.co/p/?${params}`,
      orderId,
      preview: false,
    };
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    await releaseOrder(orderId, 'cancelled');
    throw new HttpError(
      503,
      'La pasarela Stripe aún no está configurada. No se ha realizado ningún cobro.',
    );
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: input.email,
        client_reference_id: orderId,
        metadata: { orderId },
        success_url: appUrl() + confirmation,
        cancel_url: appUrl() + '/carrito',
        expires_at: Math.floor(Date.now() / 1000) + 1800,
        line_items: [
          {
            price_data: {
              currency: 'cop',
              unit_amount: total,
              product_data: {
                name: 'Pedido Élite Atelier',
                description: items
                  .map((i) => `${i.name} · ${i.size} · ${i.quantity}`)
                  .join(', ')
                  .slice(0, 400),
              },
            },
            quantity: 1,
          },
        ],
      },
      { idempotencyKey: orderId },
    );
    await c.execute({
      sql: 'UPDATE orders SET stripe_id=? WHERE id=?',
      args: [session.id, orderId],
    });
    return { url: session.url, orderId, preview: false };
  } catch {
    await releaseOrder(orderId, 'cancelled');
    throw new HttpError(
      503,
      'No pudimos iniciar el pago. No se ha realizado ningún cobro.',
    );
  }
}
export async function releaseOrder(id: string, status = 'expired') {
  const c = await db();
  const tx = await c.transaction('write');
  try {
    const r = await tx.execute({
      sql: 'SELECT items,status FROM orders WHERE id=?',
      args: [id],
    });
    const order = r.rows[0];
    if (order?.status === 'pending') {
      for (const item of JSON.parse(String(order.items)))
        await tx.execute({
          sql: 'UPDATE variants SET stock=stock+? WHERE product_id=? AND size=? AND color=?',
          args: [item.quantity, item.productId, item.size, item.color],
        });
      await tx.execute({
        sql: 'UPDATE orders SET status=? WHERE id=? AND status=?',
        args: [status, id, 'pending'],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
export async function paidOrder(
  id: string,
  eventId: string,
  amount: number,
  currency: string,
) {
  const c = await db();
  const tx = await c.transaction('write');
  let email = '';
  try {
    const duplicate = await tx.execute({
      sql: 'SELECT id FROM webhook_events WHERE id=?',
      args: [eventId],
    });
    if (duplicate.rows.length) {
      await tx.commit();
      return;
    }
    const r = await tx.execute({
      sql: 'SELECT * FROM orders WHERE id=?',
      args: [id],
    });
    const order = r.rows[0];
    if (
      !order ||
      Number(order.total) !== amount ||
      currency.toUpperCase() !== 'COP'
    )
      throw new HttpError(400, 'El importe del pago no corresponde al pedido.');
    if (order.status === 'expired' || order.status === 'cancelled')
      throw new HttpError(
        409,
        'El pedido necesita conciliación manual: pago recibido después de liberar la reserva.',
      );
    if (order.status === 'pending') {
      await tx.execute({
        sql: "UPDATE orders SET status='paid' WHERE id=?",
        args: [id],
      });
      email = String(order.email);
    }
    await tx.execute({
      sql: 'INSERT INTO webhook_events(id) VALUES(?)',
      args: [eventId],
    });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  if (email)
    await sendMail(
      email,
      'Pago confirmado · Élite Atelier',
      `Tu pago para el pedido ${id} se ha confirmado. Consulta tu cuenta para ver su estado.`,
    );
}
