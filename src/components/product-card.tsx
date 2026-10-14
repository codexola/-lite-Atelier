'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowUpRight } from 'lucide-react';
import { type Product, money } from '@/lib/catalog';
import { api, useAtelier } from './atelier-provider';
import { useState } from 'react';
export function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const [saved, setSaved] = useState(false);
  const { notify } = useAtelier();
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={'/producto/' + p.slug} aria-label={'Ver ' + p.name}>
          <Image
            src={p.image}
            alt={p.name + ' · ' + p.category}
            fill
            sizes="(max-width: 600px) 46vw, (max-width: 1000px) 31vw, 25vw"
          />
        </Link>
        <span className="product-tag">
          {p.collection === 'Éditions' ? 'ÉDITION 01' : 'SIGNATURE PIECE'}
        </span>
        <button
          className={'favorite ' + (saved ? 'saved' : '')}
          aria-label={
            saved
              ? 'Quitar de favoritos'
              : 'Guardar ' + p.name + ' en favoritos'
          }
          onClick={async () => {
            try {
              const r = await api('favorites', { productId: p.id });
              setSaved(r.saved);
              notify(
                r.saved
                  ? 'Pieza guardada en tu cuenta.'
                  : 'Pieza eliminada de favoritos.',
              );
            } catch (e) {
              notify((e as Error).message, true);
            }
          }}
        >
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <Link className="product-discover" href={'/producto/' + p.slug}>
          DESCUBRIR LA PIEZA <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="product-caption">
        <Link href={'/producto/' + p.slug}>
          <h3>{p.name}</h3>
          <span>{p.category}</span>
        </Link>
        <span className="product-price">
          {money(p.price)}
          <small>COP · {p.approved ? '' : 'concepto'}</small>
        </span>
      </div>
      <div className="swatches" aria-hidden="true">
        <i style={{ background: '#272727' }} />
        <i style={{ background: '#e2dbcd' }} />
        <i style={{ background: '#93816d' }} />
      </div>
    </article>
  );
}
