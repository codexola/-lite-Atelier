'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track, useAtelier } from './atelier-provider';
export function Analytics() {
  const path = usePathname();
  const { consent, ready } = useAtelier();
  useEffect(() => {
    if (ready && consent === 'all') track('page_view');
  }, [path, consent, ready]);
  return null;
}
