import { db, databaseConfigured } from './db';
export async function getContent(key: string, fallback: string) {
  if (!databaseConfigured()) return fallback;
  const c = await db();
  const r = await c.execute({
    sql: 'SELECT value FROM content WHERE key=?',
    args: [key],
  });
  return r.rows[0] ? String(r.rows[0].value) : fallback;
}
