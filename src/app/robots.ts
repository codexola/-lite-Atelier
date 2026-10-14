import { publicSettings } from '@/lib/settings';
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.APP_URL ||
    'https://' +
      (process.env.VERCEL_PROJECT_PRODUCTION_URL || 'localhost:3000');
  return {
    rules:
      publicSettings().mode === 'live'
        ? {
            userAgent: '*',
            allow: '/',
            disallow: [
              '/admin',
              '/cuenta',
              '/checkout',
              '/pedido',
              '/api',
              '/baja',
              '/recuperar',
            ],
          }
        : { userAgent: '*', disallow: '/' },
    sitemap: base + '/sitemap.xml',
  };
}
