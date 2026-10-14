import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import sharp, { type OutputInfo } from 'sharp';
import Stripe from 'stripe';
import { db, audit, productFromRow } from './db';
import {
  currentUser,
  requireUser,
  requireStaff,
  session,
  rateLimit,
  HttpError,
  hashPassword,
  verifyPassword,
} from './auth';
import { getTaxonomy } from './operations';
import { sendMail } from './mail';
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const text = (min = 1, max = 200) => z.string().trim().min(min).max(max);
export const mediaPath = z
  .string()
  .regex(
    /^\/(?:images\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.webp|api\/media\/[a-f0-9-]{36})$/,
  );
const amount = z.number().int().min(0).max(100000000000);
const roles = ['admin', 'operator'];
export async function operationsGet(
  key: string,
  req: NextRequest,
): Promise<Response | null> {
  if (key.startsWith('media/')) {
    const id = z.uuid().parse(key.slice(6));
    const c = await db();
    const r = await c.execute({
      sql: 'SELECT bytes,mime FROM media WHERE id=?',
      args: [id],
    });
    if (!r.rows.length) throw new HttpError(404, 'Imagen no encontrada.');
    return new Response(new Uint8Array(r.rows[0].bytes as ArrayBuffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public,max-age=31536000,immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (key === 'store/config') {
    const c = await db();
    return json({
      taxonomy: await getTaxonomy(c, true),
      shipping: (
        await c.execute(
          'SELECT * FROM shipping_methods WHERE active=1 ORDER BY fee',
        )
      ).rows,
    });
  }
  if (key === 'staff/me') return json({ user: await currentUser(true) });
  if (key === 'addresses') {
    const user = await requireUser();
    const c = await db();
    return json({
      addresses: (
        await c.execute({
          sql: 'SELECT * FROM customer_addresses WHERE user_id=?',
          args: [user.id],
        })
      ).rows,
    });
  }
  if (key === 'admin/report') {
    await requireStaff(roles);
    const c = await db();
    const totals = (
      await c.execute(
        "SELECT COUNT(*) orders,(SELECT COUNT(*) FROM users WHERE role='customer') customers,COALESCE(SUM(total),0) revenue FROM orders WHERE status IN ('paid','processing','shipped','delivered')",
      )
    ).rows[0];
    const refunds = Number(
      (
        await c.execute(
          "SELECT COALESCE(SUM(amount),0) amount FROM returns WHERE status='refunded'",
        )
      ).rows[0].amount,
    );
    const inventory = (
      await c.execute(
        'SELECT COUNT(*) variants,COALESCE(SUM(stock),0) units,SUM(CASE WHEN stock<=3 THEN 1 ELSE 0 END) lowStock FROM variants',
      )
    ).rows[0];
    const daily = (
      await c.execute(
        "SELECT substr(created_at,1,10) day,COUNT(*) orders,SUM(total) revenue FROM orders WHERE status IN ('paid','processing','shipped','delivered') GROUP BY day ORDER BY day DESC LIMIT 90",
      )
    ).rows;
    const bestsellers = (
      await c.execute(
        "SELECT json_extract(j.value,'$.name') name,SUM(json_extract(j.value,'$.quantity')) units,SUM(json_extract(j.value,'$.quantity')*json_extract(j.value,'$.price')) revenue FROM orders o,json_each(o.items) j WHERE o.status IN ('paid','processing','shipped','delivered') GROUP BY name ORDER BY units DESC LIMIT 10",
      )
    ).rows;
    return json({
      totals: {
        ...totals,
        refunds,
        netRevenue: Number(totals.revenue) - refunds,
      },
      inventory,
      daily,
      bestsellers,
    });
  }
  if (key === 'admin/export') {
    await requireStaff(roles);
    const c = await db();
    const kind = z
      .enum(['orders', 'customers', 'shipments', 'discounts'])
      .parse(req.nextUrl.searchParams.get('kind'));
    const queries = {
      orders:
        'SELECT id,name,email,address,city,country,subtotal,shipping,total,status,created_at FROM orders ORDER BY created_at DESC',
      customers:
        "SELECT id,name,email,created_at FROM users WHERE role='customer' ORDER BY created_at DESC",
      shipments: 'SELECT * FROM shipments ORDER BY created_at DESC',
      discounts: 'SELECT * FROM discounts ORDER BY code',
    };
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let offset = 0,
            headers: string[] = [];
          controller.enqueue(encoder.encode('\ufeff'));
          while (true) {
            const rows = (
              await c.execute(queries[kind] + ' LIMIT 500 OFFSET ' + offset)
            ).rows;
            if (!rows.length) break;
            if (!headers.length) {
              headers = Object.keys(rows[0]);
              controller.enqueue(encoder.encode(headers.join(',') + '\r\n'));
            }
            for (const row of rows) {
              const line =
                headers
                  .map((key) => {
                    let value = String(row[key] ?? '');
                    if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
                    return '"' + value.replaceAll('"', '""') + '"';
                  })
                  .join(',') + '\r\n';
              controller.enqueue(encoder.encode(line));
            }
            offset += rows.length;
            if (rows.length < 500) break;
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': 'attachment; filename="elite-' + kind + '.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (key === 'admin/operations') {
    const user = await requireStaff();
    const c = await db();
    const result: Record<string, unknown> = {
      taxonomy: await getTaxonomy(c),
      media: (
        await c.execute(
          'SELECT id,name,width,height,created_at FROM media ORDER BY created_at DESC LIMIT 250',
        )
      ).rows,
    };
    if (roles.includes(user.role)) {
      for (const [name, sql] of Object.entries({
        shipping: 'SELECT * FROM shipping_methods',
        shipments: 'SELECT * FROM shipments ORDER BY created_at DESC',
        discounts: 'SELECT * FROM discounts ORDER BY code',
        returns:
          'SELECT r.*,o.stripe_id FROM returns r JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC',
        campaigns: 'SELECT * FROM campaigns ORDER BY created_at DESC',
        orders: 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 500',
      })) {
        result[name] = (await c.execute(sql)).rows.map((r) =>
          name === 'orders' ? { ...r, items: JSON.parse(String(r.items)) } : r,
        );
      }
      result.customers = (
        await c.execute(
          "SELECT u.id,u.email,u.name,u.created_at,COUNT(o.id) orders,COALESCE(SUM(CASE WHEN o.status IN ('paid','processing','shipped','delivered') THEN o.total ELSE 0 END),0) revenue FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500",
        )
      ).rows;
      result.emailReady = !!(
        process.env.RESEND_API_KEY && process.env.EMAIL_FROM
      );
      result.stripeReady = !!process.env.STRIPE_SECRET_KEY;
    }
    result.reviews = (
      await c.execute(
        'SELECT r.*,d.name FROM design_reviews r JOIN designs d ON d.id=r.design_id',
      )
    ).rows;
    return json(result);
  }
  if (key === 'admin/customer') {
    await requireStaff(roles);
    const c = await db(),
      id = text().parse(req.nextUrl.searchParams.get('id'));
    const customer = (
      await c.execute({
        sql: "SELECT id,name,email,created_at FROM users WHERE id=? AND role='customer'",
        args: [id],
      })
    ).rows[0];
    if (!customer) throw new HttpError(404, 'Cliente no encontrado.');
    return json({
      customer,
      orders: (
        await c.execute({
          sql: 'SELECT id,total,status,items,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC',
          args: [id],
        })
      ).rows.map((r) => ({ ...r, items: JSON.parse(String(r.items)) })),
      addresses: (
        await c.execute({
          sql: 'SELECT * FROM customer_addresses WHERE user_id=?',
          args: [id],
        })
      ).rows,
    });
  }
  return null;
}
export async function uploadMedia(req: NextRequest) {
  const user = await requireStaff(['admin', 'editor']);
  if (Number(req.headers.get('content-length') || 0) > 3500000)
    throw new HttpError(413, 'Usa una imagen de hasta 3 MB.');
  const form = await req.formData(),
    file = form.get('file');
  if (
    !(file instanceof File) ||
    file.size > 3 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new HttpError(400, 'Sube una imagen JPG, PNG o WebP de hasta 3 MB.');
  const source = Buffer.from(await file.arrayBuffer());
  let image: Buffer, info: OutputInfo;
  try {
    const encoded = await sharp(source, {
      limitInputPixels: 24000000,
      animated: false,
    })
      .rotate()
      .resize({
        width: 1800,
        height: 2200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    image = encoded.data;
    info = encoded.info;
  } catch {
    throw new HttpError(
      400,
      'No se pudo abrir la imagen. Usa una fotografía de hasta 24 megapíxeles.',
    );
  }
  const id = crypto.randomUUID(),
    c = await db();
  await c.execute({
    sql: 'INSERT INTO media(id,name,mime,bytes,width,height,created_by) VALUES(?,?,?,?,?,?,?)',
    args: [
      id,
      file.name.slice(0, 160),
      'image/webp',
      image,
      info.width,
      info.height,
      user.id,
    ],
  });
  await audit(user.id, 'media.upload', id);
  return json(
    {
      id,
      src: '/api/media/' + id,
      name: file.name,
      width: info.width,
      height: info.height,
    },
    201,
  );
}
export async function operationsPost(
  key: string,
  body: unknown,
): Promise<Response | null> {
  const c = await db();
  if (key === 'checkout/quote') {
    const input = z
      .object({
        country: z.string().regex(/^[A-Z]{2}$/),
        shippingMethod: text(0, 80).optional(),
        discountCode: text(0, 30).optional(),
        items: z
          .array(
            z.object({
              productId: text(1, 80),
              size: text(1, 20),
              color: text(1, 40),
              quantity: z.number().int().min(1).max(10),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(body);
    let subtotal = 0;
    for (const item of input.items) {
      const row = (
        await c.execute({
          sql: 'SELECT COALESCE(v.price,p.price) price,v.stock FROM products p JOIN variants v ON v.product_id=p.id WHERE p.id=? AND v.size=? AND v.color=? AND p.active=1',
          args: [item.productId, item.size, item.color],
        })
      ).rows[0];
      if (!row || Number(row.stock) < item.quantity)
        throw new HttpError(409, 'Una variante no está disponible.');
      subtotal += Number(row.price) * item.quantity;
    }
    const method = (
      await c.execute({
        sql:
          'SELECT * FROM shipping_methods WHERE country=? AND active=1' +
          (input.shippingMethod ? ' AND id=?' : '') +
          ' ORDER BY fee LIMIT 1',
        args: input.shippingMethod
          ? [input.country, input.shippingMethod]
          : [input.country],
      })
    ).rows[0];
    if (!method)
      throw new HttpError(
        400,
        'No hay entregas configuradas para este destino.',
      );
    const shipping =
      subtotal >= Number(method.free_at) ? 0 : Number(method.fee);
    let discount = 0;
    if (input.discountCode) {
      const code = input.discountCode.toUpperCase(),
        p = (
          await c.execute({
            sql: 'SELECT * FROM discounts WHERE code=?',
            args: [code],
          })
        ).rows[0];
      if (
        !p ||
        !p.active ||
        Number(p.uses) >= Number(p.maximum_uses) ||
        Date.parse(String(p.expires_at)) <= Date.now() ||
        subtotal < Number(p.minimum)
      )
        throw new HttpError(
          409,
          'El código no está disponible o no cumple el mínimo.',
        );
      discount = Math.min(
        subtotal,
        p.type === 'percent'
          ? Math.floor((subtotal * Number(p.value)) / 100)
          : Number(p.value),
      );
    }
    return json({
      subtotal,
      shipping,
      discount,
      total: subtotal + shipping - discount,
    });
  }
  if (key === 'staff/login') {
    const input = z
      .object({ email: z.email().max(254), password: text(1, 128) })
      .parse(body);
    await rateLimit('staff-email', input.email.toLowerCase(), 12);
    const r = (
      await c.execute({
        sql: 'SELECT * FROM users WHERE email=?',
        args: [input.email.toLowerCase()],
      })
    ).rows[0];
    const valid = verifyPassword(
      input.password,
      r ? String(r.password) : hashPassword('timing-only-unavailable'),
    );
    if (
      !r ||
      !valid ||
      !['admin', 'operator', 'editor'].includes(String(r.role))
    )
      throw new HttpError(401, 'El acceso del equipo no es válido.');
    const user = {
      id: String(r.id),
      email: String(r.email),
      name: String(r.name),
      role: String(r.role),
    };
    await session(user, true);
    await audit(user.id, 'staff.login', user.id);
    return json({ user });
  }
  if (key === 'staff/logout') {
    const { cookies } = await import('next/headers');
    (await cookies()).delete('atelier_staff');
    return json({ ok: true });
  }
  if (key === 'staff/password') {
    const user = await requireStaff(),
      input = z
        .object({ currentPassword: text(1, 128), password: text(10, 128) })
        .parse(body);
    const row = (
      await c.execute({
        sql: 'SELECT password FROM users WHERE id=?',
        args: [user.id],
      })
    ).rows[0];
    if (!verifyPassword(input.currentPassword, String(row.password)))
      throw new HttpError(401, 'La contraseña actual no es correcta.');
    await c.execute({
      sql: 'UPDATE users SET password=?,session_version=session_version+1 WHERE id=?',
      args: [hashPassword(input.password), user.id],
    });
    await session(user, true);
    await audit(user.id, 'staff.password', user.id);
    return json({ ok: true });
  }
  if (key === 'addresses') {
    const user = await requireUser(),
      input = z
        .object({
          id: z.uuid().optional(),
          label: text(1, 50),
          name: text(2, 100),
          address: text(5, 200),
          city: text(2, 100),
          postal: text(2, 20),
          country: z.string().regex(/^[A-Z]{2}$/),
        })
        .parse(body);
    const id = input.id || crypto.randomUUID();
    const existing = (
      await c.execute({
        sql: 'SELECT user_id FROM customer_addresses WHERE id=?',
        args: [id],
      })
    ).rows[0];
    if (existing && existing.user_id !== user.id)
      throw new HttpError(403, 'Dirección no disponible.');
    await c.execute({
      sql: 'INSERT INTO customer_addresses(id,user_id,label,name,address,city,postal,country) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,name=excluded.name,address=excluded.address,city=excluded.city,postal=excluded.postal,country=excluded.country',
      args: [
        id,
        user.id,
        input.label,
        input.name,
        input.address,
        input.city,
        input.postal,
        input.country,
      ],
    });
    return json({ id });
  }
  if (key === 'addresses/delete') {
    const user = await requireUser(),
      input = z.object({ id: z.uuid() }).parse(body);
    await c.execute({
      sql: 'DELETE FROM customer_addresses WHERE id=? AND user_id=?',
      args: [input.id, user.id],
    });
    return json({ ok: true });
  }
  if (key === 'return/request') {
    const user = await requireUser(),
      input = z
        .object({ orderId: z.uuid(), reason: text(10, 1000) })
        .parse(body);
    const order = (
      await c.execute({
        sql: 'SELECT id,status FROM orders WHERE id=? AND user_id=?',
        args: [input.orderId, user.id],
      })
    ).rows[0];
    if (
      !order ||
      !['paid', 'processing', 'shipped', 'delivered'].includes(
        String(order.status),
      )
    )
      throw new HttpError(
        409,
        'Este pedido no admite una solicitud de devolución.',
      );
    const id = crypto.randomUUID();
    const inserted = await c.execute({
      sql: "INSERT INTO returns(id,order_id,reason) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM returns WHERE order_id=? AND (status<>'rejected' OR restocked=1)) RETURNING id",
      args: [id, input.orderId, input.reason, input.orderId],
    });
    if (!inserted.rows.length)
      throw new HttpError(409, 'Ya existe una devolución para este pedido.');
    return json({ id }, 201);
  }
  if (
    ![
      'admin/taxonomy',
      'admin/catalog',
      'admin/archive',
      'admin/shipping',
      'admin/shipment',
      'admin/discount',
      'admin/return',
      'admin/refund-record',
      'admin/refund-sync',
      'admin/design-review',
      'admin/campaign',
      'admin/campaign-send',
      'admin/staff',
    ].includes(key)
  )
    return null;
  const editorial = [
    'admin/taxonomy',
    'admin/catalog',
    'admin/archive',
    'admin/design-review',
  ];
  const user = await requireStaff(
    key === 'admin/staff'
      ? ['admin']
      : editorial.includes(key)
        ? ['admin', 'editor']
        : roles,
  );
  if (key === 'admin/taxonomy') {
    const input = z
      .object({
        id: text(1, 80).optional(),
        kind: z.enum(['category', 'collection']),
        name: text(2, 80),
        slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
        description: text(0, 1000).default(''),
        image: z.union([mediaPath, z.literal('')]).default(''),
        active: z.boolean().default(true),
        position: z.number().int().min(0).max(1000).default(0),
      })
      .parse(body);
    const id = input.id || crypto.randomUUID(),
      tx = await c.transaction('write');
    try {
      const old = (
        await tx.execute({
          sql: 'SELECT * FROM taxonomy WHERE id=?',
          args: [id],
        })
      ).rows[0];
      if (old && old.kind !== input.kind)
        throw new HttpError(409, 'El tipo de agrupación no puede cambiar.');
      const column = input.kind === 'category' ? 'category' : 'collection';
      if (
        old &&
        !input.active &&
        (
          await tx.execute({
            sql:
              'SELECT id FROM products WHERE ' +
              column +
              '=? AND active=1 LIMIT 1',
            args: [String(old.name)],
          })
        ).rows.length
      )
        throw new HttpError(
          409,
          'Mueve o retira las piezas activas antes de archivar esta agrupación.',
        );
      await tx.execute({
        sql: 'INSERT INTO taxonomy(id,kind,name,slug,description,image,active,position) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,image=excluded.image,active=excluded.active,position=excluded.position',
        args: [
          id,
          input.kind,
          input.name,
          input.slug,
          input.description,
          input.image,
          +input.active,
          input.position,
        ],
      });
      if (old && old.name !== input.name)
        await tx.execute({
          sql: 'UPDATE products SET ' + column + '=? WHERE ' + column + '=?',
          args: [input.name, String(old.name)],
        });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
    await audit(user.id, 'taxonomy.save', id);
    return json({ id });
  }
  if (key === 'admin/catalog') {
    const input = z
      .object({
        id: text(1, 80).optional(),
        slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
        name: text(2, 150),
        category: text(2, 80),
        collection: text(2, 80),
        price: amount.refine((v) => v > 0),
        image: mediaPath,
        description: text(10, 3000),
        material: text(3, 1000),
        fit: text(3, 1000),
        sku: text(1, 80),
        weight: z.number().int().min(0).max(100000),
        featured: z.boolean(),
        active: z.boolean(),
        approved: z.boolean(),
        colors: z
          .array(
            z.object({
              name: text(1, 40),
              hex: z.string().regex(/^#[a-fA-F0-9]{6}$/),
            }),
          )
          .min(1)
          .max(15),
        variants: z
          .array(
            z.object({
              size: text(1, 20),
              color: text(1, 40),
              stock: z.number().int().min(0).max(100000),
              price: amount.nullable().optional(),
            }),
          )
          .min(1)
          .max(150),
        gallery: z
          .array(
            z.object({
              src: mediaPath,
              label: text(1, 80),
              angle: text(1, 40),
              color: text(0, 40).optional(),
            }),
          )
          .max(20)
          .default([]),
      })
      .parse(body);
    if (
      new Set(input.gallery.map((g) => g.angle + '\0' + (g.color || '')))
        .size !== input.gallery.length ||
      input.gallery.some(
        (g) => g.color && !input.colors.some((c) => c.name === g.color),
      )
    )
      throw new HttpError(400, 'Revisa los colores y ángulos de la galería.');
    const keys = input.variants.map((v) => v.size + '\0' + v.color);
    if (
      new Set(keys).size !== keys.length ||
      new Set(input.colors.map((v) => v.name)).size !== input.colors.length ||
      input.variants.some(
        (v) => !input.colors.some((color) => color.name === v.color),
      )
    )
      throw new HttpError(
        400,
        'Revisa los colores y las variantes duplicadas.',
      );
    for (const [kind, name] of [
      ['category', input.category],
      ['collection', input.collection],
    ])
      if (
        !(
          await c.execute({
            sql: 'SELECT id FROM taxonomy WHERE kind=? AND name=? AND active=1',
            args: [kind, name],
          })
        ).rows.length
      )
        throw new HttpError(400, 'Elige una categoría y colección activas.');
    const id = input.id || crypto.randomUUID(),
      tx = await c.transaction('write');
    try {
      const sku = (
        await tx.execute({
          sql: 'SELECT product_id FROM product_options WHERE sku=? AND product_id<>?',
          args: [input.sku, id],
        })
      ).rows;
      if (sku.length)
        throw new HttpError(409, 'Este SKU ya pertenece a otra pieza.');
      const pending = (
        await tx.execute({
          sql: "SELECT id FROM orders WHERE status='pending' AND EXISTS(SELECT 1 FROM json_each(items) WHERE json_extract(value,'$.productId')=?) LIMIT 1",
          args: [id],
        })
      ).rows;
      if (pending.length)
        throw new HttpError(
          409,
          'Hay reservas de pago pendientes. Edita cuando se concilien.',
        );
      const stock = input.variants.reduce((n, v) => n + v.stock, 0);
      await tx.execute({
        sql: 'INSERT INTO products(id,slug,name,category,collection,price,image,description,material,fit,featured,active,approved,stock) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,category=excluded.category,collection=excluded.collection,price=excluded.price,image=excluded.image,description=excluded.description,material=excluded.material,fit=excluded.fit,featured=excluded.featured,active=excluded.active,approved=excluded.approved,stock=excluded.stock',
        args: [
          id,
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
          stock,
        ],
      });
      await tx.execute({
        sql: 'INSERT INTO product_options(product_id,sku,weight,sizes,colors,gallery) VALUES(?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET sku=excluded.sku,weight=excluded.weight,sizes=excluded.sizes,colors=excluded.colors,gallery=excluded.gallery',
        args: [
          id,
          input.sku,
          input.weight,
          JSON.stringify([...new Set(input.variants.map((v) => v.size))]),
          JSON.stringify(input.colors),
          JSON.stringify(input.gallery),
        ],
      });
      await tx.execute({
        sql: 'DELETE FROM variants WHERE product_id=?',
        args: [id],
      });
      for (const v of input.variants)
        await tx.execute({
          sql: 'INSERT INTO variants(product_id,size,color,stock,price) VALUES(?,?,?,?,?)',
          args: [id, v.size, v.color, v.stock, v.price ?? null],
        });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
    await audit(user.id, 'catalog.save', id);
    return json({ id });
  }
  if (key === 'admin/archive') {
    const input = z.object({ id: text(1, 80) }).parse(body);
    await c.execute({
      sql: 'UPDATE products SET active=0,featured=0 WHERE id=?',
      args: [input.id],
    });
    await audit(user.id, 'catalog.archive', input.id);
    return json({ ok: true });
  }
  if (key === 'admin/shipping') {
    const input = z
      .object({
        id: text(1, 80).optional(),
        name: text(2, 100),
        country: z.string().regex(/^[A-Z]{2}$/),
        fee: amount,
        freeAt: amount,
        estimate: text(3, 200),
        active: z.boolean(),
      })
      .parse(body);
    const id = input.id || crypto.randomUUID();
    await c.execute({
      sql: 'INSERT INTO shipping_methods(id,name,country,fee,free_at,estimate,active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,country=excluded.country,fee=excluded.fee,free_at=excluded.free_at,estimate=excluded.estimate,active=excluded.active',
      args: [
        id,
        input.name,
        input.country,
        input.fee,
        input.freeAt,
        input.estimate,
        +input.active,
      ],
    });
    await audit(user.id, 'shipping.save', id);
    return json({ id });
  }
  if (key === 'admin/shipment') {
    const input = z
      .object({
        orderId: z.uuid(),
        carrier: text(2, 100),
        tracking: text(2, 120),
        url: z.union([
          z.url().refine((v) => new URL(v).protocol === 'https:'),
          z.literal(''),
        ]),
        status: z.enum(['prepared', 'shipped', 'delivered']),
        note: text(0, 1000).default(''),
      })
      .parse(body);
    const tx = await c.transaction('write');
    try {
      const order = (
        await tx.execute({
          sql: 'SELECT * FROM orders WHERE id=?',
          args: [input.orderId],
        })
      ).rows[0];
      if (
        !order ||
        !['paid', 'processing', 'shipped', 'delivered'].includes(
          String(order.status),
        )
      )
        throw new HttpError(409, 'Solo se preparan envíos de pedidos pagados.');
      if (order.status === 'delivered' && input.status !== 'delivered')
        throw new HttpError(409, 'Un envío entregado no puede retroceder.');
      if (order.status === 'shipped' && input.status === 'prepared')
        throw new HttpError(409, 'Un envío despachado no puede retroceder.');
      await tx.execute({
        sql: 'INSERT INTO shipments(id,order_id,carrier,tracking,url,status,note) VALUES(?,?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET carrier=excluded.carrier,tracking=excluded.tracking,url=excluded.url,status=excluded.status,note=excluded.note,updated_at=CURRENT_TIMESTAMP',
        args: [
          crypto.randomUUID(),
          input.orderId,
          input.carrier,
          input.tracking,
          input.url,
          input.status,
          input.note,
        ],
      });
      if (input.status !== 'prepared')
        await tx.execute({
          sql: 'UPDATE orders SET status=? WHERE id=?',
          args: [input.status, input.orderId],
        });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
    await audit(user.id, 'shipment.' + input.status, input.orderId);
    const order = (
      await c.execute({
        sql: 'SELECT email FROM orders WHERE id=?',
        args: [input.orderId],
      })
    ).rows[0];
    const email = await sendMail(
      String(order.email),
      'Tu envío · Élite Atelier',
      'Pedido ' +
        input.orderId +
        '\nTransportadora: ' +
        input.carrier +
        '\nSeguimiento: ' +
        input.tracking +
        '\n' +
        input.url,
    );
    return json({ ok: true, emailSent: email.sent });
  }
  if (key === 'admin/discount') {
    const input = z
      .object({
        code: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z0-9-]{3,30}$/),
        type: z.enum(['percent', 'fixed']),
        value: amount,
        minimum: amount,
        maximumUses: z.number().int().min(1).max(100000),
        expiresAt: z.iso.datetime(),
        active: z.boolean(),
      })
      .parse(body);
    if (input.type === 'percent' && (input.value < 1 || input.value > 80))
      throw new HttpError(
        400,
        'El descuento porcentual debe estar entre 1 y 80.',
      );
    await c.execute({
      sql: 'INSERT INTO discounts(code,type,value,minimum,maximum_uses,expires_at,active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET type=excluded.type,value=excluded.value,minimum=excluded.minimum,maximum_uses=excluded.maximum_uses,expires_at=excluded.expires_at,active=excluded.active',
      args: [
        input.code,
        input.type,
        input.value,
        input.minimum,
        input.maximumUses,
        input.expiresAt,
        +input.active,
      ],
    });
    await audit(user.id, 'discount.save', input.code);
    return json({ ok: true });
  }
  if (key === 'admin/design-review') {
    const input = z
      .object({
        id: z.uuid(),
        status: z.enum([
          'reviewing',
          'feasible',
          'changes',
          'approved',
          'rejected',
        ]),
        feasibility: text(10, 2000),
        cost: amount,
        note: text(0, 2000),
      })
      .parse(body);
    if (
      !(
        await c.execute({
          sql: "SELECT id FROM designs WHERE id=? AND status<>'private'",
          args: [input.id],
        })
      ).rows.length
    )
      throw new HttpError(404, 'Propuesta compartida no encontrada.');
    await c.execute({
      sql: 'INSERT INTO design_reviews(design_id,status,feasibility,cost,note,reviewer) VALUES(?,?,?,?,?,?) ON CONFLICT(design_id) DO UPDATE SET status=excluded.status,feasibility=excluded.feasibility,cost=excluded.cost,note=excluded.note,reviewer=excluded.reviewer,updated_at=CURRENT_TIMESTAMP',
      args: [
        input.id,
        input.status,
        input.feasibility,
        input.cost,
        input.note,
        user.id,
      ],
    });
    await audit(user.id, 'design.review', input.id);
    return json({ ok: true });
  }
  if (key === 'admin/campaign') {
    const input = z
      .object({
        id: z.uuid().optional(),
        title: text(3, 150),
        subject: text(3, 150),
        body: text(10, 10000),
        segment: z.enum(['subscribers', 'customers']),
      })
      .parse(body);
    const id = input.id || crypto.randomUUID();
    const old = (
      await c.execute({
        sql: 'SELECT status FROM campaigns WHERE id=?',
        args: [id],
      })
    ).rows[0];
    if (old && old.status !== 'draft')
      throw new HttpError(409, 'Una campaña enviada no se puede editar.');
    await c.execute({
      sql: 'INSERT INTO campaigns(id,title,subject,body,segment) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subject=excluded.subject,body=excluded.body,segment=excluded.segment',
      args: [id, input.title, input.subject, input.body, input.segment],
    });
    await audit(user.id, 'campaign.draft', id);
    return json({ id });
  }
  if (key === 'admin/campaign-send') {
    const input = z
      .object({ id: z.uuid(), confirmed: z.literal(true) })
      .parse(body);
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM ||
      !process.env.APP_URL
    )
      throw new HttpError(
        503,
        'Configura email y URL pública antes de enviar.',
      );
    const campaign = (
      await c.execute({
        sql: 'SELECT * FROM campaigns WHERE id=?',
        args: [input.id],
      })
    ).rows[0];
    if (!campaign) throw new HttpError(404, 'Campaña no encontrada.');
    const leads = (
      await c.execute({
        sql:
          'SELECT l.* FROM leads l WHERE consent=1' +
          (campaign.segment === 'customers'
            ? ' AND EXISTS(SELECT 1 FROM users u WHERE u.email=l.email)'
            : '') +
          ' AND NOT EXISTS(SELECT 1 FROM campaign_deliveries d WHERE d.campaign_id=? AND d.lead_id=l.id) ORDER BY l.created_at LIMIT 5',
        args: [input.id],
      })
    ).rows;
    let sent = 0,
      failed = 0;
    for (const lead of leads) {
      const claim = await c.execute({
        sql: "INSERT OR IGNORE INTO campaign_deliveries(campaign_id,lead_id,status) VALUES(?,?,'sending')",
        args: [input.id, String(lead.id)],
      });
      if (!claim.rowsAffected) continue;
      const stillConsented = (
        await c.execute({
          sql: 'SELECT consent FROM leads WHERE id=?',
          args: [String(lead.id)],
        })
      ).rows[0]?.consent;
      if (!stillConsented) {
        await c.execute({
          sql: "UPDATE campaign_deliveries SET status='skipped' WHERE campaign_id=? AND lead_id=?",
          args: [input.id, String(lead.id)],
        });
        continue;
      }
      const result = await sendMail(
        String(lead.email),
        String(campaign.subject),
        String(campaign.body) +
          '\n\nCancelar suscripción: ' +
          process.env.APP_URL +
          '/baja?token=' +
          lead.unsubscribe_token,
      );
      await c.execute({
        sql: 'UPDATE campaign_deliveries SET status=? WHERE campaign_id=? AND lead_id=?',
        args: [result.sent ? 'sent' : 'failed', input.id, String(lead.id)],
      });
      result.sent ? sent++ : failed++;
    }
    const remaining = Number(
      (
        await c.execute({
          sql:
            'SELECT COUNT(*) count FROM leads l WHERE consent=1' +
            (campaign.segment === 'customers'
              ? ' AND EXISTS(SELECT 1 FROM users u WHERE u.email=l.email)'
              : '') +
            ' AND NOT EXISTS(SELECT 1 FROM campaign_deliveries d WHERE d.campaign_id=? AND d.lead_id=l.id)',
          args: [input.id],
        })
      ).rows[0].count,
    );
    const unresolved = Number(
      (
        await c.execute({
          sql: "SELECT COUNT(*) count FROM campaign_deliveries WHERE campaign_id=? AND status IN ('failed','sending')",
          args: [input.id],
        })
      ).rows[0].count,
    );
    await c.execute({
      sql: 'UPDATE campaigns SET status=? WHERE id=?',
      args: [
        remaining ? 'partial' : unresolved ? 'attention' : 'sent',
        input.id,
      ],
    });
    await audit(user.id, 'campaign.send', input.id);
    return json({ sent, failed, remaining, unresolved, limit: 5 });
  }
  if (key === 'admin/staff') {
    const input = z
      .object({
        email: z.email().max(254),
        name: text(2, 100),
        role: z.enum(['admin', 'editor', 'operator']),
        password: text(10, 128),
      })
      .parse(body);
    const exists = (
      await c.execute({
        sql: 'SELECT id FROM users WHERE email=?',
        args: [input.email.toLowerCase()],
      })
    ).rows;
    if (exists.length)
      throw new HttpError(
        409,
        'La cuenta existe. Gestiona su rol desde Usuarios.',
      );
    const id = crypto.randomUUID();
    await c.execute({
      sql: 'INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?)',
      args: [
        id,
        input.email.toLowerCase(),
        input.name,
        hashPassword(input.password),
        input.role,
      ],
    });
    await audit(user.id, 'staff.create', id);
    return json({ id }, 201);
  }
  if (key === 'admin/refund-sync') {
    const input = z.object({ id: z.uuid() }).parse(body);
    const record = (
      await c.execute({
        sql: 'SELECT * FROM returns WHERE id=?',
        args: [input.id],
      })
    ).rows[0];
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !record ||
      !String(record.provider_reference).startsWith('re_')
    )
      throw new HttpError(
        409,
        'Este reembolso requiere conciliación en su pasarela.',
      );
    const refund = await new Stripe(
      process.env.STRIPE_SECRET_KEY,
    ).refunds.retrieve(String(record.provider_reference));
    if (
      refund.metadata?.atelierReturn !== input.id ||
      refund.amount !== Number(record.amount) ||
      refund.currency !== 'cop'
    )
      throw new HttpError(
        409,
        'La referencia no coincide con esta devolución.',
      );
    const next =
      refund.status === 'succeeded'
        ? 'refunded'
        : ['failed', 'canceled'].includes(String(refund.status))
          ? 'refund-requested'
          : 'refund-pending';
    await c.execute({
      sql: 'UPDATE returns SET status=? WHERE id=?',
      args: [next, input.id],
    });
    await audit(user.id, 'refund.reconcile', input.id);
    return json({ ok: true, status: next });
  }
  if (key === 'admin/refund-record') {
    const input = z
      .object({
        id: z.uuid(),
        reference: text(5, 150),
        note: text(10, 2000),
        confirmed: z.literal(true),
      })
      .parse(body);
    const r = (
      await c.execute({
        sql: 'SELECT r.*,o.stripe_id FROM returns r JOIN orders o ON o.id=r.order_id WHERE r.id=?',
        args: [input.id],
      })
    ).rows[0];
    if (
      !r ||
      r.status !== 'refund-requested' ||
      String(r.stripe_id || '').startsWith('cs_')
    )
      throw new HttpError(
        409,
        'Este reembolso requiere conciliación con su pasarela.',
      );
    await c.execute({
      sql: "UPDATE returns SET status='refunded',provider_reference=?,note=? WHERE id=? AND status='refund-requested'",
      args: [input.reference, input.note, input.id],
    });
    await audit(user.id, 'refund.manual-attestation', input.id);
    return json({ ok: true, confirmation: 'operator-attested' });
  }
  if (key === 'admin/return') {
    const input = z
      .object({
        id: z.uuid(),
        status: z.enum([
          'approved',
          'received',
          'rejected',
          'refund-requested',
        ]),
        note: text(5, 2000),
        amount: amount,
        restock: z.boolean().default(false),
      })
      .parse(body);
    const tx = await c.transaction('write');
    let refund: Record<string, unknown> | undefined;
    try {
      const record = (
        await tx.execute({
          sql: 'SELECT r.*,o.items,o.total,o.stripe_id FROM returns r JOIN orders o ON o.id=r.order_id WHERE r.id=?',
          args: [input.id],
        })
      ).rows[0];
      if (!record) throw new HttpError(404, 'Solicitud no encontrada.');
      const transitions: Record<string, string[]> = {
        requested: ['approved', 'rejected'],
        approved: ['received', 'refund-requested'],
        received: ['refund-requested'],
      };
      if (
        !transitions[String(record.status)]?.includes(input.status) ||
        input.amount > Number(record.total) ||
        (input.status === 'refund-requested' && input.amount === 0)
      )
        throw new HttpError(
          409,
          'Revisa el estado y el importe de devolución.',
        );
      if (input.restock && !record.restocked) {
        if (input.status !== 'received')
          throw new HttpError(
            409,
            'Reintegra stock solo al recibir todas las piezas devueltas.',
          );
        for (const item of JSON.parse(String(record.items)))
          await tx.execute({
            sql: 'UPDATE variants SET stock=stock+? WHERE product_id=? AND size=? AND color=?',
            args: [item.quantity, item.productId, item.size, item.color],
          });
      }
      await tx.execute({
        sql: 'UPDATE returns SET status=?,amount=?,note=?,restocked=CASE WHEN ?=1 THEN 1 ELSE restocked END WHERE id=?',
        args: [
          input.status,
          input.amount,
          input.note,
          +input.restock,
          input.id,
        ],
      });
      refund = record;
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
    if (
      input.status === 'refund-requested' &&
      String(refund?.stripe_id || '').startsWith('cs_') &&
      process.env.STRIPE_SECRET_KEY
    ) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const checkout = await stripe.checkout.sessions.retrieve(
          String(refund!.stripe_id),
        );
        if (!checkout.payment_intent) throw new Error('Pago no conciliado.');
        const result = await stripe.refunds.create(
          {
            payment_intent: String(checkout.payment_intent),
            amount: input.amount,
            metadata: { atelierReturn: input.id },
          },
          { idempotencyKey: 'atelier-refund-' + input.id },
        );
        await c.execute({
          sql: 'UPDATE returns SET status=?,provider_reference=? WHERE id=?',
          args: [
            result.status === 'succeeded' ? 'refunded' : 'refund-pending',
            result.id,
            input.id,
          ],
        });
      } catch {
        throw new HttpError(
          503,
          'La solicitud quedó registrada. Concilia el reembolso en la pasarela antes de reintentar.',
        );
      }
    }
    await audit(user.id, 'return.' + input.status, input.id);
    return json({
      ok: true,
      manual: !String(refund?.stripe_id || '').startsWith('cs_'),
    });
  }
  return null;
}
