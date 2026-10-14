import { publicSettings } from '@/lib/settings';
import type { Metadata } from 'next';
import { AtelierProvider } from '@/components/atelier-provider';
import { Analytics } from '@/components/analytics';
import { EditorialMotion } from '@/components/motion';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import './globals.css';
import './workspace.css';
import './modern.css';
import './tryon.css';
const base =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: 'Élite Atelier — Viste tu identidad',
    template: '%s | Élite Atelier',
  },
  description:
    'Moda como autoexpresión. Descubre el universo Élite Atelier: colecciones conceptuales, tu propio atelier y una comunidad que celebra la identidad.',
  openGraph: {
    title: 'Élite Atelier — Viste tu identidad',
    description: 'No naciste para encajar. Naciste para ser tú.',
    images: [{ url: '/images/campaign.webp', width: 1536, height: 1024 }],
    locale: 'es_CO',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: publicSettings().mode === 'live', follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AtelierProvider>
          <Analytics />
          <EditorialMotion />
          <a href="#main" className="skip-link">
            Saltar al contenido
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter mode={publicSettings().mode} />
        </AtelierProvider>
      </body>
    </html>
  );
}
