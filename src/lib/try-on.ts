import Fashn from 'fashn';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db, getProducts } from './db';
import { requireUser, rateLimit, HttpError } from './auth';
import { garmentAsset, productColors } from './garment-assets';
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
export function providerClient() {
  if (!process.env.FASHN_API_KEY)
    throw new HttpError(
      503,
      'El probador realista necesita configurar FASHN_API_KEY. La cámara local sigue disponible.',
    );
  return new Fashn({
    apiKey: process.env.FASHN_API_KEY,
    maxRetries: 0,
    timeout: 20000,
    logLevel: 'off',
  });
}
export async function initializeTryOn(c: Awaited<ReturnType<typeof db>>) {
  await c.execute(
    "CREATE TABLE IF NOT EXISTS try_on_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL,color TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL,fingerprint TEXT NOT NULL,provider_id TEXT,status TEXT NOT NULL DEFAULT 'submitting',created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL)",
  );
  await c.execute({
    sql: 'DELETE FROM try_on_jobs WHERE expires_at<?',
    args: [Date.now()],
  });
}
export async function tryOnGet(
  key: string,
  req: NextRequest,
): Promise<Response | null> {
  if (key === 'try-on/config')
    return json({
      provider: 'FASHN',
      configured: !!process.env.FASHN_API_KEY,
      model: 'tryon-max',
      localPreview: true,
    });
  if (!key.startsWith('try-on/jobs/')) return null;
  const user = await requireUser(),
    id = z.uuid().parse(key.slice(12)),
    c = await db();
  await initializeTryOn(c);
  const job = (
    await c.execute({
      sql: 'SELECT * FROM try_on_jobs WHERE id=? AND user_id=?',
      args: [id, user.id],
    })
  ).rows[0];
  if (!job || Number(job.expires_at) < Date.now() || job.status === 'deleted')
    throw new HttpError(404, 'Esta vista previa ya no está disponible.');
  if (!job.provider_id)
    return json({
      id,
      status: job.status,
      error:
        job.status === 'failed'
          ? 'No se pudo iniciar la generación.'
          : undefined,
    });
  await rateLimit('try-on-poll', user.id, 150);
  try {
    const result = await providerClient().predictions.status(
      String(job.provider_id),
    );
    const update = await c.execute({
      sql: "UPDATE try_on_jobs SET status=? WHERE id=? AND user_id=? AND status<>'deleted'",
      args: [result.status, id, user.id],
    });
    if (!update.rowsAffected)
      throw new HttpError(404, 'Esta vista previa se borró.');
    let image: string | null = null;
    if (result.status === 'completed' && Array.isArray(result.output)) {
      const encoded = result.output.find(
        (s) =>
          s.length < 16000000 &&
          /^(?:data:image\/(?:jpeg|png);base64,)?[A-Za-z0-9+/=]+$/.test(s),
      );
      if (encoded) {
        try {
          const bytes = Buffer.from(
            encoded.replace(/^data:image\/(?:jpeg|png);base64,/, ''),
            'base64',
          );
          const rendered = await sharp(bytes, { limitInputPixels: 24000000 })
            .rotate()
            .resize({
              width: 1600,
              height: 2000,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 88 })
            .toBuffer();
          if (rendered.length <= 3000000)
            image = 'data:image/jpeg;base64,' + rendered.toString('base64');
        } catch {
          image = null;
        }
      }
    }
    if (result.status === 'completed' && !image)
      throw new HttpError(
        502,
        'El proveedor no entregó una imagen privada válida.',
      );
    return json({
      id,
      status: result.status,
      image: image || undefined,
      error:
        result.status === 'failed'
          ? 'No se pudo generar esta combinación. Prueba una foto frontal con buena luz y la prenda visible.'
          : undefined,
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      502,
      'No pudimos consultar FASHN. Reintenta el seguimiento sin iniciar otra generación.',
    );
  }
}
export async function startTryOn(req: NextRequest) {
  const user = await requireUser();
  providerClient();
  await rateLimit('try-on-generation', user.id, 5);
  if (Number(req.headers.get('content-length') || 0) > 3500000)
    throw new HttpError(413, 'Usa una fotografía de hasta 3 MB.');
  const form = await req.formData();
  const input = z
    .object({
      productId: z.string().max(80),
      color: z.string().max(40),
      key: z.uuid(),
      consent: z.literal('true'),
    })
    .parse(
      Object.fromEntries(
        ['productId', 'color', 'key', 'consent'].map((k) => [k, form.get(k)]),
      ),
    );
  const file = form.get('photo');
  if (
    !(file instanceof File) ||
    file.size > 3 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new HttpError(
      400,
      'Elige una fotografía JPG, PNG o WebP de hasta 3 MB.',
    );
  const product = (await getProducts()).find((p) => p.id === input.productId);
  if (!product || !productColors(product).includes(input.color))
    throw new HttpError(400, 'Esta combinación no está disponible.');
  const c = await db();
  await initializeTryOn(c);
  const requestKey = createHash('sha256')
    .update(user.id + input.key)
    .digest('hex');
  const source = Buffer.from(await file.arrayBuffer());
  const fingerprint = createHash('sha256')
    .update(product.id + input.color)
    .update(source)
    .digest('hex');
  const existing = (
    await c.execute({
      sql: 'SELECT id,status,fingerprint FROM try_on_jobs WHERE request_key=? AND user_id=?',
      args: [requestKey, user.id],
    })
  ).rows[0];
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        'Esta solicitud cambió. Inicia una nueva vista previa.',
      );
    return json({ id: existing.id, status: existing.status }, 202);
  }
  let person: Buffer;
  try {
    person = await sharp(source, { limitInputPixels: 24000000 })
      .rotate()
      .resize({
        width: 1200,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      'No se pudo abrir la foto. Usa una imagen de hasta 24 megapíxeles.',
    );
  }
  const reference =
    garmentAsset(product, input.color) ||
    product.gallery?.find((g) => g.color === input.color)?.src ||
    product.image;
  let garment: Buffer;
  if (reference.startsWith('/api/media/')) {
    const row = (
      await c.execute({
        sql: 'SELECT bytes FROM media WHERE id=?',
        args: [reference.slice(11)],
      })
    ).rows[0];
    if (!row)
      throw new HttpError(
        404,
        'La fotografía de esta pieza no está disponible.',
      );
    garment = Buffer.from(row.bytes as ArrayBuffer);
  } else {
    if (!/^\/images\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.webp$/.test(reference))
      throw new HttpError(400, 'La referencia de prenda no es válida.');
    garment = await readFile(path.join(process.cwd(), 'public', reference));
  }
  garment = await sharp(garment)
    .flatten({ background: '#ffffff' })
    .resize({
      width: 1200,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
  const id = crypto.randomUUID(),
    now = Date.now();
  const inserted = await c.execute({
    sql: 'INSERT OR IGNORE INTO try_on_jobs(id,user_id,product_id,color,request_key,fingerprint,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)',
    args: [
      id,
      user.id,
      product.id,
      input.color,
      requestKey,
      fingerprint,
      now,
      now + 3600000,
    ],
  });
  if (!inserted.rowsAffected) {
    const prior = (
      await c.execute({
        sql: 'SELECT id,status,fingerprint FROM try_on_jobs WHERE request_key=?',
        args: [requestKey],
      })
    ).rows[0];
    if (prior.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        'Esta solicitud cambió. Inicia una nueva vista previa.',
      );
    return json({ id: prior.id, status: prior.status }, 202);
  }
  try {
    const result = await providerClient().predictions.run({
      model_name: 'tryon-max',
      inputs: {
        model_image: 'data:image/jpeg;base64,' + person.toString('base64'),
        product_image: 'data:image/jpeg;base64,' + garment.toString('base64'),
        generation_mode: 'quality',
        num_images: 1,
        resolution: '1k',
        output_format: 'jpeg',
        return_base64: true,
      },
    });
    if (result.error || !result.id)
      throw new Error('Provider rejected generation.');
    await c.execute({
      sql: "UPDATE try_on_jobs SET provider_id=?,status='starting' WHERE id=? AND status<>'deleted'",
      args: [result.id, id],
    });
    return json({ id, status: 'starting' }, 202);
  } catch {
    await c.execute({
      sql: "UPDATE try_on_jobs SET status='failed' WHERE id=? AND status<>'deleted'",
      args: [id],
    });
    throw new HttpError(
      502,
      'FASHN no pudo iniciar la generación. Revisa la configuración y los créditos de la cuenta.',
    );
  }
}
export async function deleteTryOn(body: unknown) {
  const user = await requireUser(),
    input = z.object({ id: z.uuid() }).parse(body),
    c = await db();
  await initializeTryOn(c);
  await c.execute({
    sql: "UPDATE try_on_jobs SET status='deleted',provider_id=NULL WHERE id=? AND user_id=?",
    args: [input.id, user.id],
  });
  return json({ ok: true, providerCancelled: false });
}
