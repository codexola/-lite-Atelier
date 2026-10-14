import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/db';
import { articles } from '@/lib/journal';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
      : 'http://localhost:3000');
  const paths = [
    '',
    '/colecciones',
    '/manifiesto',
    '/universo',
    '/probador-virtual',
    '/co-creacion',
    '/comunidad',
    '/identidad',
    '/journal',
    '/contacto',
    '/ayuda',
    '/guia-tallas',
    ...(await getProducts()).map((p) => '/producto/' + p.slug),
    ...articles.map((a) => '/journal/' + a.slug),
  ];
  return paths.map((p) => ({
    url: base + p,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.7,
  }));
}
