import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { db, audit, databaseConfigured, productFromRow } from '@/lib/db';
import {
  currentUser,
  requireUser,
  session,
  hashPassword,
  verifyPassword,
  rateLimit,
  HttpError,
} from '@/lib/auth';
import { checkoutSchema, styleResult, orderTransition } from '@/lib/domain';
import {
  checkout,
  paidOrder,
  releaseOrder,
  liveCommerce,
} from '@/lib/commerce';
import { sendMail } from '@/lib/mail';
import {
  verifyWompiSignature,
  authoritativeWompiTransaction,
} from '@/lib/wompi';
export const runtime = 'nodejs';
const text = (min = 1, max = 500) => z.string().trim().min(min).max(max);
function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status });
}
function error(e: unknown) {
  if (e instanceof z.ZodError)
    return json(
      { error: e.issues[0]?.message || 'Comprueba los datos del formulario.' },
      400,
    );
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error('API failure', e instanceof Error ? e.message : 'unknown');
  return json(
    { error: 'No pudimos completar la operación. Inténtalo de nuevo.' },
    503,
  );
}
function validateOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) throw new HttpError(403, 'Origen de solicitud no permitido.');
  let source: URL;
  try {
    source = new URL(origin);
  } catch {
    throw new HttpError(403, 'Origen de solicitud no permitido.');
  }
  const host = req.headers.get('host');
  const sameHost =
    source.host === host && ['http:', 'https:'].includes(source.protocol);
  const configured =
    process.env.APP_URL &&
    source.origin === new URL(process.env.APP_URL).origin;
  if (!sameHost && !configured)
    throw new HttpError(403, 'Origen de solicitud no permitido.');
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const key = (await params).path.join('/');
    if (key === 'health') {
      if (!databaseConfigured())
        return json(
          {
            status: 'configuration-required',
            database: false,
            commerce: 'preview',
          },
          503,
        );
      const c = await db();
      await c.execute('SELECT 1');
      const authReady =
        !process.env.VERCEL ||
        !!(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
      const paymentReady =
        process.env.PAYMENT_PROVIDER === 'stripe'
          ? !!(
              process.env.STRIPE_SECRET_KEY &&
              process.env.STRIPE_WEBHOOK_SECRET &&
              process.env.APP_URL
            )
          : !!(
              process.env.WOMPI_PUBLIC_KEY &&
              process.env.WOMPI_INTEGRITY_SECRET &&
              process.env.WOMPI_EVENTS_SECRET &&
              process.env.APP_URL
            );
      const ready = authReady && (!liveCommerce() || paymentReady);
      return json(
        {
          status: ready ? 'ok' : 'configuration-required',
          database: true,
          auth: authReady,
          commerce: liveCommerce() ? 'live' : 'preview',
          payment: paymentReady,
        },
        ready ? 200 : 503,
      );
    }
    if (key === 'me') {
      const user = await currentUser();
      if (!user) return json({ user: null });
      const c = await db();
      const [orders, favorites, designs] = await Promise.all([
        c.execute({
          sql: 'SELECT id,items,total,status,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC',
          args: [user.id],
        }),
        c.execute({
          sql: 'SELECT product_id FROM favorites WHERE user_id=?',
          args: [user.id],
        }),
        c.execute({
          sql: 'SELECT * FROM designs WHERE user_id=? ORDER BY created_at DESC',
          args: [user.id],
        }),
      ]);
      return json({
        user,
        orders: orders.rows.map((r) => ({
          ...r,
          items: JSON.parse(String(r.items)),
        })),
        favorites: favorites.rows.map((r) => r.product_id),
        designs: designs.rows,
      });
    }
    if (key === 'community') {
      const c = await db();
      const user = await currentUser();
      const posts = await c.execute({
        sql: "SELECT p.*,COALESCE(u.name,'Élite Atelier · Editorial') author,(SELECT COUNT(*) FROM likes WHERE post_id=p.id) likes,(SELECT COUNT(*) FROM likes WHERE post_id=p.id AND user_id=?) liked FROM posts p LEFT JOIN users u ON u.id=p.user_id WHERE p.status='published' ORDER BY p.created_at DESC",
        args: [user?.id || ''],
      });
      const designs = await c.execute(
        "SELECT d.id,d.name,d.model,d.color,d.material,u.name author,(SELECT COUNT(*) FROM votes WHERE design_id=d.id) votes FROM designs d JOIN users u ON u.id=d.user_id WHERE d.status='published' ORDER BY d.created_at DESC",
      );
      const comments = await c.execute(
        "SELECT c.id,c.post_id,c.body,u.name author FROM comments c JOIN users u ON u.id=c.user_id WHERE c.status='published' ORDER BY c.created_at",
      );
      return json({
        posts: posts.rows,
        designs: designs.rows,
        comments: comments.rows,
      });
    }
    if (key.startsWith('orders/')) {
      const c = await db();
      const id = key.split('/')[1];
      const user = await currentUser();
      const r = await c.execute({
        sql: 'SELECT * FROM orders WHERE id=?',
        args: [id],
      });
      const order = r.rows[0];
      if (
        !order ||
        !(
          (user && order.user_id === user.id) ||
          req.nextUrl.searchParams.get('token') === order.access_token
        )
      )
        throw new HttpError(404, 'Pedido no encontrado.');
      return json({
        order: {
          id: order.id,
          name: order.name,
          status: order.status,
          items: JSON.parse(String(order.items)),
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
          created_at: order.created_at,
        },
      });
    }
    if (key === 'admin/variants') {
      await requireUser(['admin', 'editor']);
      const c = await db();
      const id = req.nextUrl.searchParams.get('id');
      if (!id) throw new HttpError(400, 'Pieza requerida.');
      return json({
        variants: (
          await c.execute({
            sql: 'SELECT * FROM variants WHERE product_id=? ORDER BY size,color',
            args: [id],
          })
        ).rows,
      });
    }
    if (key === 'admin') {
      const user = await requireUser(['admin', 'editor', 'operator']);
      const c = await db();
      const result: Record<string, unknown> = { user };
      if (['admin', 'operator'].includes(user.role)) {
        result.orders = (
          await c.execute(
            'SELECT id,name,email,items,total,status,stripe_id,created_at FROM orders ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.contacts = (
          await c.execute(
            'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.leads = (
          await c.execute(
            'SELECT id,email,name,consent,source,created_at FROM leads ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
      }
      if (['admin', 'editor'].includes(user.role)) {
        result.products = (
          await c.execute('SELECT * FROM products ORDER BY rowid')
        ).rows.map(productFromRow);
        result.posts = (
          await c.execute(
            'SELECT * FROM posts ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.designs = (
          await c.execute(
            'SELECT * FROM designs ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.comments = (
          await c.execute(
            'SELECT * FROM comments ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.content = (await c.execute('SELECT * FROM content')).rows;
      }
      if (user.role === 'admin') {
        result.users = (
          await c.execute(
            'SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 200',
          )
        ).rows;
        result.events = (
          await c.execute(
            'SELECT name,COUNT(*) count FROM events GROUP BY name',
          )
        ).rows;
        result.audit = (
          await c.execute(
            'SELECT * FROM audit ORDER BY created_at DESC LIMIT 50',
          )
        ).rows;
      }
      return json(result);
    }
    throw new HttpError(404, 'Ruta no encontrada.');
  } catch (e) {
    return error(e);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const key = (await params).path.join('/');
    if (key.startsWith('webhooks/')) return webhook(req, key);
    validateOrigin(req);
    if (Number(req.headers.get('content-length') || 0) > 50000)
      throw new HttpError(413, 'Solicitud demasiado grande.');
    const raw = await req.text();
    if (raw.length > 50000)
      throw new HttpError(413, 'Solicitud demasiado grande.');
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'Formato de solicitud inválido.');
    }
    const c = await db();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
    await rateLimit(key, ip, key.startsWith('auth') ? 25 : 150);
    if (key === 'auth/register') {
      const input = z
        .object({
          name: text(2, 100),
          email: z.email().max(254),
          password: z.string().min(10).max(128),
        })
        .parse(body);
      const email = input.email.toLowerCase();
      if (
        (
          await c.execute({
            sql: 'SELECT id FROM users WHERE email=?',
            args: [email],
          })
        ).rows.length
      )
        throw new HttpError(
          409,
          'Este correo ya tiene una cuenta. Inicia sesión.',
        );
      const user = {
        id: crypto.randomUUID(),
        email,
        name: input.name,
        role: 'customer',
      };
      await c.execute({
        sql: 'INSERT INTO users(id,email,name,password) VALUES(?,?,?,?)',
        args: [user.id, email, user.name, hashPassword(input.password)],
      });
      await session(user);
      return json({ user }, 201);
    }
    if (key === 'auth/login') {
      const input = z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(128),
        })
        .parse(body);
      await rateLimit('login-email', input.email.toLowerCase(), 15);
      const r = await c.execute({
        sql: 'SELECT * FROM users WHERE email=?',
        args: [input.email.toLowerCase()],
      });
      const record = r.rows[0];
      if (
        !verifyPassword(
          input.password,
          record
            ? String(record.password)
            : hashPassword('invalid-password-timing'),
        )
      )
        throw new HttpError(401, 'El correo o la contraseña no son correctos.');
      const user = {
        id: String(record.id),
        email: String(record.email),
        name: String(record.name),
        role: String(record.role),
      };
      await session(user);
      return json({ user });
    }
    if (key === 'auth/logout') {
      (await cookies()).delete('atelier_session');
      return json({ ok: true });
    }
    if (key === 'auth/profile') {
      const user = await requireUser();
      const input = z.object({ name: text(2, 100) }).parse(body);
      await c.execute({
        sql: 'UPDATE users SET name=? WHERE id=?',
        args: [input.name, user.id],
      });
      return json({ ok: true });
    }
    if (key === 'auth/password') {
      const user = await requireUser();
      const input = z
        .object({
          current: z.string().max(128),
          password: z.string().min(10).max(128),
        })
        .parse(body);
      const r = await c.execute({
        sql: 'SELECT password FROM users WHERE id=?',
        args: [user.id],
      });
      if (!verifyPassword(input.current, String(r.rows[0].password)))
        throw new HttpError(400, 'La contraseña actual no es correcta.');
      await c.execute({
        sql: 'UPDATE users SET password=?,session_version=session_version+1 WHERE id=?',
        args: [hashPassword(input.password), user.id],
      });
      await session(user);
      return json({ ok: true });
    }
    if (key === 'contact') {
      const input = z
        .object({
          name: text(2, 100),
          email: z.email().max(254),
          subject: z.enum([
            'Información general',
            'Mi pedido',
            'Colaboraciones',
            'Privacidad y datos personales',
            'Reportar contenido',
          ]),
          message: text(10, 3000),
          consent: z.literal(true),
        })
        .parse(body);
      await c.execute({
        sql: 'INSERT INTO contacts(id,name,email,subject,message) VALUES(?,?,?,?,?)',
        args: [
          crypto.randomUUID(),
          input.name,
          input.email.toLowerCase(),
          input.subject,
          input.message,
        ],
      });
      return json({ ok: true }, 201);
    }
    if (key === 'auth/forgot') {
      const input = z.object({ email: z.email().max(254) }).parse(body);
      await rateLimit('password-reset', input.email.toLowerCase(), 3);
      if (
        !process.env.RESEND_API_KEY ||
        !process.env.EMAIL_FROM ||
        !process.env.APP_URL
      )
        throw new HttpError(
          503,
          'La recuperación por correo necesita configurar el servicio de email. Contacta al administrador.',
        );
      const r = await c.execute({
        sql: 'SELECT id FROM users WHERE email=?',
        args: [input.email.toLowerCase()],
      });
      if (r.rows.length) {
        const token = randomBytes(32).toString('hex');
        await c.execute({
          sql: 'INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)',
          args: [
            createHash('sha256').update(token).digest('hex'),
            String(r.rows[0].id),
            Date.now() + 1800000,
          ],
        });
        await sendMail(
          input.email,
          'Recuperar tu acceso · Élite Atelier',
          `Para cambiar tu contraseña, abre este enlace en los próximos 30 minutos: ${process.env.APP_URL}/recuperar?token=${token}. Si no lo solicitaste, ignora este mensaje.`,
        );
      }
      return json({ ok: true });
    }
    if (key === 'auth/reset') {
      const input = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(10).max(128),
        })
        .parse(body);
      const tokenHash = createHash('sha256').update(input.token).digest('hex');
      const tx = await c.transaction('write');
      try {
        const r = await tx.execute({
          sql: 'DELETE FROM password_resets WHERE token_hash=? AND expires_at>? RETURNING user_id',
          args: [tokenHash, Date.now()],
        });
        if (!r.rows.length)
          throw new HttpError(
            400,
            'El enlace no es válido o ha vencido. Solicita uno nuevo.',
          );
        await tx.execute({
          sql: 'UPDATE users SET password=?,session_version=session_version+1 WHERE id=?',
          args: [hashPassword(input.password), String(r.rows[0].user_id)],
        });
        await tx.execute({
          sql: 'DELETE FROM password_resets WHERE user_id=?',
          args: [String(r.rows[0].user_id)],
        });
        await tx.commit();
      } catch (e) {
        await tx.rollback();
        throw e;
      } finally {
        tx.close();
      }
      return json({ ok: true });
    }
    if (key === 'leads') {
      const input = z
        .object({
          email: z.email().max(254),
          name: text(0, 100).optional(),
          consent: z.literal(true),
          source: z.enum(['newsletter', 'quiz', 'waitlist']),
        })
        .parse(body);
      const token = crypto.randomUUID();
      await c.execute({
        sql: 'INSERT INTO leads(id,email,name,consent,source,unsubscribe_token) VALUES(?,?,?,1,?,?) ON CONFLICT(email) DO UPDATE SET consent=1,source=excluded.source',
        args: [
          crypto.randomUUID(),
          input.email.toLowerCase(),
          input.name || '',
          input.source,
          token,
        ],
      });
      const existingToken = (
        await c.execute({
          sql: 'SELECT unsubscribe_token FROM leads WHERE email=?',
          args: [input.email.toLowerCase()],
        })
      ).rows[0].unsubscribe_token;
      const email = await sendMail(
        input.email,
        'Bienvenido a Élite Atelier',
        `Gracias por unirte a nuestra lista de acceso anticipado. Aún no hay una fecha comercial confirmada. Para darte de baja: ${process.env.APP_URL || 'http://localhost:3000'}/baja?token=${existingToken}`,
      );
      return json({ ok: true, emailSent: email.sent });
    }
    if (key === 'unsubscribe') {
      const input = z.object({ token: z.uuid() }).parse(body);
      await c.execute({
        sql: 'UPDATE leads SET consent=0 WHERE unsubscribe_token=?',
        args: [input.token],
      });
      return json({ ok: true });
    }
    if (key === 'checkout') {
      return json(
        await checkout(checkoutSchema.parse(body), await currentUser()),
      );
    }
    if (key === 'favorites') {
      const user = await requireUser();
      const input = z.object({ productId: text(1, 80) }).parse(body);
      if (
        !(
          await c.execute({
            sql: 'SELECT id FROM products WHERE id=? AND active=1',
            args: [input.productId],
          })
        ).rows.length
      )
        throw new HttpError(404, 'Pieza no encontrada.');
      const r = await c.execute({
        sql: 'DELETE FROM favorites WHERE user_id=? AND product_id=?',
        args: [user.id, input.productId],
      });
      if (!r.rowsAffected)
        await c.execute({
          sql: 'INSERT INTO favorites(user_id,product_id) VALUES(?,?)',
          args: [user.id, input.productId],
        });
      return json({ saved: !r.rowsAffected });
    }
    if (key === 'quiz') {
      const input = z
        .object({ answers: z.array(z.number().int().min(0).max(2)).length(4) })
        .parse(body);
      return json({ profile: styleResult(input.answers) });
    }
    if (key === 'designs') {
      const user = await requireUser();
      const input = z
        .object({
          name: text(3, 100),
          model: z.enum(['Blazer', 'Pantalón', 'Top']),
          material: z.enum(['Lana', 'Lino', 'Satén']),
          color: z.enum(['Noir', 'Ivory', 'Taupe']),
          detail: z.enum(['Clásico', 'Contraste', 'Minimal']),
          size: z.enum(['XS', 'S', 'M', 'L', 'XL']),
          share: z.boolean(),
        })
        .parse(body);
      const id = crypto.randomUUID();
      await c.execute({
        sql: 'INSERT INTO designs(id,user_id,name,model,material,color,detail,size,status) VALUES(?,?,?,?,?,?,?,?,?)',
        args: [
          id,
          user.id,
          input.name,
          input.model,
          input.material,
          input.color,
          input.detail,
          input.size,
          input.share ? 'pending' : 'private',
        ],
      });
      return json({ id, status: input.share ? 'pending' : 'private' }, 201);
    }
    if (key === 'posts') {
      const user = await requireUser();
      const input = z
        .object({
          title: text(3, 100),
          body: text(10, 3000),
          category: z.enum(['Inspiración', 'Creaciones', 'Historias']),
        })
        .parse(body);
      await c.execute({
        sql: 'INSERT INTO posts(id,user_id,title,body,category) VALUES(?,?,?,?,?)',
        args: [
          crypto.randomUUID(),
          user.id,
          input.title,
          input.body,
          input.category,
        ],
      });
      return json({ ok: true, pending: true }, 201);
    }
    if (key === 'comments') {
      const user = await requireUser();
      const input = z
        .object({ postId: text(1, 80), body: text(2, 1000) })
        .parse(body);
      if (
        !(
          await c.execute({
            sql: "SELECT id FROM posts WHERE id=? AND status='published'",
            args: [input.postId],
          })
        ).rows.length
      )
        throw new HttpError(404, 'Publicación no encontrada.');
      await c.execute({
        sql: 'INSERT INTO comments(id,user_id,post_id,body) VALUES(?,?,?,?)',
        args: [crypto.randomUUID(), user.id, input.postId, input.body],
      });
      return json({ ok: true, pending: true }, 201);
    }
    if (key === 'likes' || key === 'votes') {
      const user = await requireUser();
      const input = z.object({ id: text(1, 80) }).parse(body);
      const table = key === 'likes' ? 'likes' : 'votes';
      const entity = key === 'likes' ? 'posts' : 'designs';
      const column = key === 'likes' ? 'post_id' : 'design_id';
      if (
        !(
          await c.execute({
            sql: `SELECT id FROM ${entity} WHERE id=? AND status='published'`,
            args: [input.id],
          })
        ).rows.length
      )
        throw new HttpError(404, 'Contenido no encontrado.');
      const r = await c.execute({
        sql: `DELETE FROM ${table} WHERE user_id=? AND ${column}=?`,
        args: [user.id, input.id],
      });
      if (!r.rowsAffected)
        await c.execute({
          sql: `INSERT INTO ${table}(user_id,${column}) VALUES(?,?)`,
          args: [user.id, input.id],
        });
      return json({ active: !r.rowsAffected });
    }
    if (key === 'events') {
      const input = z
        .object({
          name: z.enum([
            'page_view',
            'product_view',
            'add_to_cart',
            'checkout_start',
            'quiz_complete',
            'lead_signup',
          ]),
          consent: z.literal(true),
        })
        .parse(body);
      await c.execute({
        sql: 'INSERT INTO events(id,name) VALUES(?,?)',
        args: [crypto.randomUUID(), input.name],
      });
      return json({ ok: true });
    }
    if (key === 'admin/variant') {
      const user = await requireUser(['admin', 'editor']);
      const input = z
        .object({
          productId: text(1, 80),
          size: z.enum(['XS', 'S', 'M', 'L', 'XL']),
          color: z.enum(['Noir', 'Ivory', 'Taupe']),
          stock: z.number().int().min(0).max(10000),
        })
        .parse(body);
      const tx = await c.transaction('write');
      try {
        const reserved = await tx.execute({
          sql: "SELECT id FROM orders WHERE status='pending' AND EXISTS(SELECT 1 FROM json_each(orders.items) WHERE json_extract(value,'$.productId')=? AND json_extract(value,'$.size')=? AND json_extract(value,'$.color')=?) LIMIT 1",
          args: [input.productId, input.size, input.color],
        });
        if (reserved.rows.length)
          throw new HttpError(
            409,
            'Hay una reserva de pago pendiente para esta variante.',
          );
        const r = await tx.execute({
          sql: 'UPDATE variants SET stock=? WHERE product_id=? AND size=? AND color=?',
          args: [input.stock, input.productId, input.size, input.color],
        });
        if (!r.rowsAffected)
          throw new HttpError(404, 'Variante no encontrada.');
        await tx.commit();
      } catch (e) {
        await tx.rollback();
        throw e;
      } finally {
        tx.close();
      }
      await audit(
        user.id,
        'variant.stock',
        input.productId + ':' + input.size + ':' + input.color,
      );
      return json({ ok: true });
    }
    if (key === 'admin/reconcile') {
      const user = await requireUser(['admin', 'operator']);
      const input = z.object({ id: text(1, 80) }).parse(body);
      const r = await c.execute({
        sql: 'SELECT * FROM orders WHERE id=?',
        args: [input.id],
      });
      const order = r.rows[0];
      if (!order || order.status !== 'pending')
        throw new HttpError(409, 'El pedido no tiene un pago pendiente.');
      const providerId = String(order.stripe_id || '');
      if (!providerId)
        throw new HttpError(
          409,
          'Todavía no hay identificador de pago. Busca la referencia del pedido en la pasarela antes de liberar la reserva.',
        );
      if (providerId.startsWith('wompi:')) {
        if (!process.env.WOMPI_PUBLIC_KEY)
          throw new HttpError(503, 'Wompi no está configurado.');
        const t = await authoritativeWompiTransaction(
          providerId.slice(6),
          process.env.WOMPI_PUBLIC_KEY,
        );
        if (t.reference !== input.id)
          throw new HttpError(409, 'La transacción no corresponde al pedido.');
        if (t.status === 'APPROVED')
          await paidOrder(
            t.reference,
            'wompi-' + t.id,
            t.amount_in_cents,
            t.currency,
          );
        if (['DECLINED', 'VOIDED', 'ERROR'].includes(t.status))
          await releaseOrder(t.reference, 'cancelled');
      } else {
        if (!process.env.STRIPE_SECRET_KEY)
          throw new HttpError(503, 'Stripe no está configurado.');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const payment = await stripe.checkout.sessions.retrieve(providerId);
        if (payment.metadata?.orderId !== input.id)
          throw new HttpError(409, 'La sesión no corresponde al pedido.');
        if (payment.payment_status === 'paid')
          await paidOrder(
            input.id,
            'reconcile-' + payment.id,
            payment.amount_total || 0,
            payment.currency || '',
          );
        if (payment.status === 'expired') await releaseOrder(input.id);
      }
      await audit(user.id, 'payment.reconcile', input.id);
      return json({ ok: true });
    }
    if (key === 'admin/product') {
      const user = await requireUser(['admin', 'editor']);
      const input = z
        .object({
          id: text(1, 80),
          slug: z
            .string()
            .regex(/^[a-z0-9-]+$/)
            .max(100),
          name: text(2, 100),
          category: z.enum(['Sastrería', 'Esenciales', 'Vestidos']),
          collection: z.enum(['Signature', 'Éditions', 'Origine']),
          price: z.number().int().min(100).max(100000000000),
          image: z.string().regex(/^\/images\/[a-z0-9-]+\.webp$/),
          description: text(10, 2000),
          material: text(3, 500),
          fit: text(3, 500),
          featured: z.boolean(),
          active: z.boolean(),
          approved: z.boolean(),
          stock: z.number().int().min(0).max(10000),
        })
        .parse(body);
      const tx = await c.transaction('write');
      try {
        const old = await tx.execute({
          sql: 'SELECT stock FROM products WHERE id=?',
          args: [input.id],
        });
        await tx.execute({
          sql: 'INSERT INTO products(id,slug,name,category,collection,price,image,description,material,fit,featured,active,approved,stock) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,category=excluded.category,collection=excluded.collection,price=excluded.price,image=excluded.image,description=excluded.description,material=excluded.material,fit=excluded.fit,featured=excluded.featured,active=excluded.active,approved=excluded.approved,stock=excluded.stock',
          args: [
            input.id,
            input.slug,
            input.name,
            input.category,
            input.collection,
            input.price,
            input.image,
            input.description,
            input.material,
            input.fit,
            +input.featured,
            +input.active,
            +input.approved,
            input.stock,
          ],
        });
        if (!old.rows.length || Number(old.rows[0].stock) !== input.stock) {
          const reserved = await tx.execute({
            sql: "SELECT id FROM orders WHERE status='pending' AND EXISTS(SELECT 1 FROM json_each(orders.items) WHERE json_extract(value,'$.productId')=?) LIMIT 1",
            args: [input.id],
          });
          if (reserved.rows.length)
            throw new HttpError(
              409,
              'Hay reservas de pago pendientes para esta pieza. No se puede reemplazar su stock.',
            );
          for (const size of ['XS', 'S', 'M', 'L', 'XL'])
            for (const color of ['Noir', 'Ivory', 'Taupe'])
              await tx.execute({
                sql: 'INSERT INTO variants(product_id,size,color,stock) VALUES(?,?,?,?) ON CONFLICT(product_id,size,color) DO UPDATE SET stock=excluded.stock',
                args: [input.id, size, color, input.stock],
              });
        }
        await tx.commit();
      } catch (e) {
        await tx.rollback();
        throw e;
      } finally {
        tx.close();
      }
      await audit(user.id, 'product.update', input.id);
      return json({ ok: true });
    }
    if (key === 'admin/contact') {
      const user = await requireUser(['admin', 'operator']);
      const input = z
        .object({ id: text(1, 80), status: z.enum(['new', 'resolved']) })
        .parse(body);
      await c.execute({
        sql: 'UPDATE contacts SET status=? WHERE id=?',
        args: [input.status, input.id],
      });
      await audit(user.id, 'contact.' + input.status, input.id);
      return json({ ok: true });
    }
    if (key === 'admin/order') {
      const user = await requireUser(['admin', 'operator']);
      const input = z
        .object({
          id: text(1, 80),
          status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']),
        })
        .parse(body);
      const tx = await c.transaction('write');
      try {
        const r = await tx.execute({
          sql: 'SELECT status FROM orders WHERE id=?',
          args: [input.id],
        });
        const old = String(r.rows[0]?.status);
        if (!orderTransition(old, input.status))
          throw new HttpError(409, 'Este cambio de estado no es válido.');
        if (
          input.status === 'cancelled' &&
          ['paid', 'processing'].includes(old)
        )
          throw new HttpError(
            409,
            'Reembolsa y concilia el pago en la pasarela antes de cancelar un pedido pagado.',
          );
        if (old === 'pending')
          throw new HttpError(
            409,
            'Los pedidos pendientes se cancelan desde la pasarela para evitar pagos tardíos.',
          );
        await tx.execute({
          sql: 'UPDATE orders SET status=? WHERE id=? AND status=?',
          args: [input.status, input.id, old],
        });
        await tx.commit();
      } catch (e) {
        await tx.rollback();
        throw e;
      } finally {
        tx.close();
      }
      await audit(user.id, 'order.' + input.status, input.id);
      return json({ ok: true });
    }
    if (key === 'admin/moderate') {
      const user = await requireUser(['admin', 'editor']);
      const input = z
        .object({
          id: text(1, 80),
          type: z.enum(['posts', 'designs', 'comments']),
          status: z.enum(['published', 'rejected']),
        })
        .parse(body);
      await c.execute({
        sql: `UPDATE ${input.type} SET status=? WHERE id=?`,
        args: [input.status, input.id],
      });
      await audit(user.id, input.type + '.' + input.status, input.id);
      return json({ ok: true });
    }
    if (key === 'admin/content') {
      const user = await requireUser(['admin', 'editor']);
      const input = z
        .object({
          key: z.enum([
            'home_title',
            'home_intro',
            'manifesto',
            'shipping_policy',
            'returns_policy',
            'privacy_policy',
            'terms_policy',
            'contact_email',
          ]),
          value: text(3, 10000),
        })
        .parse(body);
      await c.execute({
        sql: 'INSERT INTO content(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        args: [input.key, input.value],
      });
      await audit(user.id, 'content.update', input.key);
      return json({ ok: true });
    }
    if (key === 'admin/role') {
      const user = await requireUser(['admin']);
      const input = z
        .object({
          id: text(1, 80),
          role: z.enum(['customer', 'editor', 'operator', 'admin']),
        })
        .parse(body);
      if (input.id === user.id)
        throw new HttpError(409, 'No puedes cambiar tu propio rol.');
      await c.execute({
        sql: 'UPDATE users SET role=? WHERE id=?',
        args: [input.role, input.id],
      });
      await audit(user.id, 'role.' + input.role, input.id);
      return json({ ok: true });
    }
    throw new HttpError(404, 'Ruta no encontrada.');
  } catch (e) {
    return error(e);
  }
}
async function webhook(req: NextRequest, key: string) {
  try {
    if (key === 'webhooks/stripe') {
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
        throw new HttpError(503, 'Webhook no configurado.');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const signature = req.headers.get('stripe-signature');
      if (!signature) throw new HttpError(400, 'Firma requerida.');
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          await req.text(),
          signature,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        throw new HttpError(400, 'Firma inválida.');
      }
      if (
        event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded'
      ) {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === 'paid' && s.metadata?.orderId)
          await paidOrder(
            s.metadata.orderId,
            event.id,
            s.amount_total || 0,
            s.currency || '',
          );
      }
      if (
        event.type === 'checkout.session.expired' ||
        event.type === 'checkout.session.async_payment_failed'
      ) {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.metadata?.orderId) await releaseOrder(s.metadata.orderId);
      }
      return json({ received: true });
    }
    if (key === 'webhooks/wompi') {
      if (!process.env.WOMPI_EVENTS_SECRET || !process.env.WOMPI_PUBLIC_KEY)
        throw new HttpError(503, 'Webhook no configurado.');
      const raw = await req.text();
      if (raw.length > 100000)
        throw new HttpError(413, 'Solicitud demasiado grande.');
      const event = JSON.parse(raw);
      const signed = verifyWompiSignature(
        event,
        process.env.WOMPI_EVENTS_SECRET,
      );
      if (event.event === 'transaction.updated') {
        const t = await authoritativeWompiTransaction(
          signed.id,
          process.env.WOMPI_PUBLIC_KEY,
        );
        if (t.id !== signed.id || t.amount_in_cents !== signed.amount_in_cents)
          throw new HttpError(400, 'La transacción no coincide con el evento.');
        if (t.status === 'APPROVED')
          await paidOrder(
            t.reference,
            'wompi-' + t.id,
            t.amount_in_cents,
            t.currency,
          );
        if (['DECLINED', 'VOIDED', 'ERROR'].includes(t.status))
          await releaseOrder(t.reference, 'cancelled');
        if (t.status === 'PENDING') {
          const c = await db();
          await c.execute({
            sql: 'UPDATE orders SET stripe_id=? WHERE id=? AND status=? AND total=?',
            args: ['wompi:' + t.id, t.reference, 'pending', t.amount_in_cents],
          });
        }
      }
      return json({ received: true });
    }
    throw new HttpError(404, 'Webhook no encontrado.');
  } catch (e) {
    return error(e);
  }
}
