import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { products, sizes, colors } from './catalog';
const globals = globalThis as unknown as {
  atelierDb?: Client;
  atelierInit?: Promise<void>;
};
export function databaseConfigured() {
  return !!process.env.TURSO_DATABASE_URL || !process.env.VERCEL;
}
function client() {
  if (!databaseConfigured())
    throw new Error('La base de datos no está configurada.');
  if (!globals.atelierDb) {
    if (!process.env.TURSO_DATABASE_URL)
      mkdirSync(path.join(process.cwd(), '.data'), { recursive: true });
    globals.atelierDb = createClient({
      url:
        process.env.TURSO_DATABASE_URL ||
        `file:${path.join(process.cwd(), '.data/atelier.db')}`,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globals.atelierDb;
}
export async function db() {
  const c = client();
  if (!globals.atelierInit)
    globals.atelierInit = initialize(c).catch((e) => {
      globals.atelierInit = undefined;
      throw e;
    });
  await globals.atelierInit;
  return c;
}
async function initialize(c: Client) {
  await c.executeMultiple(`
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',session_version INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,collection TEXT NOT NULL,price INTEGER NOT NULL,image TEXT NOT NULL,description TEXT NOT NULL,material TEXT NOT NULL,fit TEXT NOT NULL,featured INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,approved INTEGER NOT NULL DEFAULT 0,stock INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS variants(product_id TEXT NOT NULL REFERENCES products(id),size TEXT NOT NULL,color TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0),PRIMARY KEY(product_id,size,color));
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),email TEXT NOT NULL,name TEXT NOT NULL,address TEXT NOT NULL,city TEXT NOT NULL,postal TEXT NOT NULL,country TEXT NOT NULL,items TEXT NOT NULL,subtotal INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL,stripe_id TEXT UNIQUE,idempotency_key TEXT UNIQUE NOT NULL,request_hash TEXT NOT NULL,access_token TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT,consent INTEGER NOT NULL,source TEXT NOT NULL,unsubscribe_token TEXT UNIQUE NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS password_resets(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(user_id TEXT NOT NULL REFERENCES users(id),product_id TEXT NOT NULL REFERENCES products(id),PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS designs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,model TEXT NOT NULL,material TEXT NOT NULL,color TEXT NOT NULL,detail TEXT NOT NULL,size TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'private',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS votes(user_id TEXT NOT NULL REFERENCES users(id),design_id TEXT NOT NULL REFERENCES designs(id),PRIMARY KEY(user_id,design_id));
CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,image TEXT,category TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS likes(user_id TEXT NOT NULL REFERENCES users(id),post_id TEXT NOT NULL REFERENCES posts(id),PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),post_id TEXT NOT NULL REFERENCES posts(id),body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS content(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);
  for (const p of products) {
    const inserted = await c.execute({
      sql: 'INSERT OR IGNORE INTO products(id,slug,name,category,collection,price,image,description,material,fit,featured,active,approved,stock) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [
        p.id,
        p.slug,
        p.name,
        p.category,
        p.collection,
        p.price,
        p.image,
        p.description,
        p.material,
        p.fit,
        +p.featured,
        +p.active,
        +p.approved,
        p.stock,
      ],
    });
    if (inserted.rowsAffected)
      for (const size of sizes)
        for (const color of colors)
          await c.execute({
            sql: 'INSERT OR IGNORE INTO variants(product_id,size,color,stock) VALUES(?,?,?,?)',
            args: [p.id, size, color.name, p.stock],
          });
  }
  const editorials = [
    [
      'editorial-1',
      'La belleza de elegirte',
      'La sastrería se libera de las reglas. Explora proporciones amplias, tonos profundos y detalles que expresan tu identidad. Una historia editorial de Élite Atelier.',
      '/images/community-1.webp',
      'Historias',
    ],
    [
      'editorial-2',
      'El arte de los pequeños detalles',
      'Una textura, una costura, un gesto. En el universo Atelier, la intención se encuentra en lo que permanece.',
      '/images/community-2.webp',
      'Inspiración',
    ],
    [
      'editorial-3',
      'Una ciudad, infinitas identidades',
      'El estilo personal se construye caminando. Encuentra inspiración en la arquitectura, la luz y las personas que habitan tu ciudad.',
      '/images/community-3.webp',
      'Historias',
    ],
  ];
  for (const p of editorials)
    await c.execute({
      sql: "INSERT OR IGNORE INTO posts(id,title,body,image,category,status) VALUES(?,?,?,?,?,'published')",
      args: p,
    });
}
export function productFromRow(r: Record<string, unknown>) {
  return {
    ...r,
    featured: !!r.featured,
    active: !!r.active,
    approved: !!r.approved,
  } as unknown as import('./catalog').Product;
}
export async function getProducts() {
  if (!databaseConfigured()) return products;
  const c = await db();
  const r = await c.execute(
    'SELECT * FROM products WHERE active=1 ORDER BY rowid',
  );
  return r.rows.map((r) => productFromRow(r));
}
export async function audit(userId: string, action: string, target: string) {
  const c = await db();
  await c.execute({
    sql: 'INSERT INTO audit(id,user_id,action,target) VALUES(?,?,?,?)',
    args: [crypto.randomUUID(), userId, action, target],
  });
}
