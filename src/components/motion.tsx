'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export function EditorialMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-pending');
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08, rootMargin: '0px 0px 40px 0px' },
    );
    const scan = () =>
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.getBoundingClientRect().top > window.innerHeight) {
          el.classList.add('reveal-pending');
          observer.observe(el);
        }
      });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById('main')!, {
      childList: true,
      subtree: true,
    });
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      const el = (event.target as Element).closest<HTMLElement>('[data-tilt]');
      if (!el) return;
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width,
        y = (event.clientY - box.top) / box.height;
      el.style.setProperty('--shine-x', x * 100 + '%');
      el.style.setProperty('--shine-y', y * 100 + '%');
      el.style.setProperty('--tilt-x', (y - 0.5) * -4 + 'deg');
      el.style.setProperty('--tilt-y', (x - 0.5) * 4 + 'deg');
    }
    function reset(event: PointerEvent) {
      const el = (event.target as Element).closest<HTMLElement>('[data-tilt]');
      if (
        el &&
        (!(event.relatedTarget instanceof Node) ||
          !el.contains(event.relatedTarget))
      ) {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      }
    }
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', reset, { passive: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', reset);
      document
        .querySelectorAll('.reveal-pending')
        .forEach((el) => el.classList.remove('reveal-pending'));
    };
  }, [pathname]);
  return null;
}
