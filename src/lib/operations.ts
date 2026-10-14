import type { Client } from '@libsql/client';
import { createHash } from 'node:crypto';
import { hashPassword } from './password';
import { productCategories, collections } from './catalog';
export async function initializeOperations(c: Client) {
  await c.executeMultiple(`
CREATE TABLE IF NOT EXISTS app_migrations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS taxonomy(id TEXT PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,slug TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1,position INTEGER NOT NULL DEFAULT 0,UNIQUE(kind,name),UNIQUE(kind,slug));
CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,name TEXT NOT NULL,mime TEXT NOT NULL,bytes BLOB NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS product_options(product_id TEXT PRIMARY KEY REFERENCES products(id),sku TEXT NOT NULL DEFAULT '',weight INTEGER NOT NULL DEFAULT 0,sizes TEXT NOT NULL DEFAULT '[]',colors TEXT NOT NULL DEFAULT '[]',gallery TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS shipping_methods(id TEXT PRIMARY KEY,name TEXT NOT NULL,country TEXT NOT NULL DEFAULT 'CO',fee INTEGER NOT NULL,free_at INTEGER NOT NULL,estimate TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY,order_id TEXT UNIQUE NOT NULL REFERENCES orders(id),carrier TEXT NOT NULL,tracking TEXT NOT NULL,url TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'prepared',note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS discounts(code TEXT PRIMARY KEY,type TEXT NOT NULL,value INTEGER NOT NULL,minimum INTEGER NOT NULL DEFAULT 0,maximum_uses INTEGER NOT NULL DEFAULT 100,uses INTEGER NOT NULL DEFAULT 0,expires_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS order_adjustments(order_id TEXT PRIMARY KEY REFERENCES orders(id),discount_code TEXT,discount INTEGER NOT NULL DEFAULT 0,shipping_method TEXT,tax INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS returns(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'requested',amount INTEGER NOT NULL DEFAULT 0,provider_reference TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',restocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS customer_addresses(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),label TEXT NOT NULL,name TEXT NOT NULL,address TEXT NOT NULL,city TEXT NOT NULL,postal TEXT NOT NULL,country TEXT NOT NULL DEFAULT 'CO');
CREATE TABLE IF NOT EXISTS design_reviews(design_id TEXT PRIMARY KEY REFERENCES designs(id),status TEXT NOT NULL,feasibility TEXT NOT NULL,cost INTEGER NOT NULL DEFAULT 0,note TEXT NOT NULL DEFAULT '',reviewer TEXT NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,title TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,segment TEXT NOT NULL DEFAULT 'subscribers',status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS campaign_deliveries(campaign_id TEXT NOT NULL REFERENCES campaigns(id),lead_id TEXT NOT NULL REFERENCES leads(id),status TEXT NOT NULL DEFAULT 'pending',provider_id TEXT NOT NULL DEFAULT '',PRIMARY KEY(campaign_id,lead_id));
CREATE INDEX IF NOT EXISTS orders_customer ON orders(user_id,created_at);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status,created_at);
CREATE INDEX IF NOT EXISTS products_taxonomy ON products(category,collection,active);
CREATE INDEX IF NOT EXISTS returns_order ON returns(order_id,status);
`);
  for (const [i, name] of productCategories.entries())
    await c.execute({
      sql: 'INSERT OR IGNORE INTO taxonomy(id,kind,name,slug,position) VALUES(?,?,?,?,?)',
      args: ['category-' + i, 'category', name, 'category-' + i, i],
    });
  for (const [i, item] of collections.entries())
    await c.execute({
      sql: 'INSERT OR IGNORE INTO taxonomy(id,kind,name,slug,description,image,position) VALUES(?,?,?,?,?,?,?)',
      args: [
        'collection-' + i,
        'collection',
        item.name,
        ['signature', 'editions', 'origine'][i],
        item.description,
        item.image,
        i,
      ],
    });
  await c.execute({
    sql: 'INSERT OR IGNORE INTO shipping_methods(id,name,country,fee,free_at,estimate) VALUES(?,?,?,?,?,?)',
    args: [
      'standard',
      'Entrega estándar',
      'CO',
      2500000,
      120000000,
      'Plazo sujeto a confirmación de la marca',
    ],
  });
  const variantColumns = (await c.execute('PRAGMA table_info(variants)')).rows;
  if (!variantColumns.some((r) => r.name === 'price')) {
    try {
      await c.execute('ALTER TABLE variants ADD COLUMN price INTEGER');
    } catch (e) {
      if (
        !(await c.execute('PRAGMA table_info(variants)')).rows.some(
          (r) => r.name === 'price',
        )
      )
        throw e;
    }
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (
    email &&
    password &&
    password.length >= 10 &&
    password.length <= 128 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    const marker =
      'staff-bootstrap-' + createHash('sha256').update(email).digest('hex');
    const tx = await c.transaction('write');
    try {
      const done = await tx.execute({
        sql: 'SELECT id FROM app_migrations WHERE id=?',
        args: [marker],
      });
      if (!done.rows.length) {
        await tx.execute({
          sql: "INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,'admin') ON CONFLICT(email) DO UPDATE SET role='admin',password=excluded.password,session_version=users.session_version+1",
          args: [
            crypto.randomUUID(),
            email,
            'Dirección Élite',
            hashPassword(password),
          ],
        });
        await tx.execute({
          sql: 'INSERT INTO app_migrations(id) VALUES(?)',
          args: [marker],
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
}
export function optionsFromRow(row: Record<string, unknown>) {
  const parse = (value: unknown) => {
    try {
      return JSON.parse(String(value || '[]'));
    } catch {
      return [];
    }
  };
  return {
    sku: String(row.sku || ''),
    weight: Number(row.weight || 0),
    sizeOptions: parse(row.sizes),
    colorOptions: parse(row.colors),
    gallery: parse(row.gallery),
  };
}
export async function getTaxonomy(c: Client, active = false) {
  return (
    await c.execute(
      'SELECT * FROM taxonomy' +
        (active ? ' WHERE active=1' : '') +
        ' ORDER BY kind,position,name',
    )
  ).rows.map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description),
    image: String(r.image),
    position: Number(r.position),
    active: !!r.active,
  }));
}
