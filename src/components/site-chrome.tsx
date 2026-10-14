'use client';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
export function SiteHeader() {
  return usePathname().startsWith('/admin') ? null : <Header />;
}
export function SiteFooter({ mode }: { mode: string }) {
  return usePathname().startsWith('/admin') ? null : <Footer mode={mode} />;
}
