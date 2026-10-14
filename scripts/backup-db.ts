import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { db } from '../src/lib/db';
if (
  process.env.TURSO_DATABASE_URL &&
  !process.env.TURSO_DATABASE_URL.startsWith('file:')
) {
  console.error(
    'For hosted Turso, use the provider snapshot/PIT recovery controls. This script verifies local SQLite backups only.',
  );
  process.exit(1);
}
const c = await db();
const directory = path.resolve('.data/backups');
mkdirSync(directory, { recursive: true });
const target = path.join(
  directory,
  'atelier-' + new Date().toISOString().replaceAll(':', '-') + '.db',
);
await c.execute("VACUUM INTO '" + target.replaceAll("'", "''") + "'");
const restored = createClient({ url: 'file:' + target });
for (const table of [
  'users',
  'products',
  'variants',
  'orders',
  'leads',
  'posts',
  'designs',
]) {
  const original = await c.execute('SELECT COUNT(*) count FROM ' + table);
  const copy = await restored.execute('SELECT COUNT(*) count FROM ' + table);
  if (Number(original.rows[0].count) !== Number(copy.rows[0].count))
    throw new Error('Restore verification failed for ' + table);
}
console.log(
  'Local backup created and restored-table counts verified. File: ' + target,
);
restored.close();
c.close();
