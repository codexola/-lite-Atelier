import { db } from '../src/lib/db';
const c = await db();
const products = await c.execute('SELECT COUNT(*) count FROM products');
const variants = await c.execute('SELECT COUNT(*) count FROM variants');
console.log(
  JSON.stringify({
    database: 'ok',
    products: Number(products.rows[0].count),
    variants: Number(variants.rows[0].count),
  }),
);
c.close();
