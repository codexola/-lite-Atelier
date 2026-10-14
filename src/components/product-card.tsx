'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowUpRight } from 'lucide-react';
import { productMedia, wornImage } from '@/lib/product-media';
import { type Product, money, colors } from '@/lib/catalog';
import { api, useAtelier } from './atelier-provider';
import { useState } from 'react';
export function ProductCard({
  product: p,
  index = 0,
  presentation = 'model',
}: {
  product: Product;
  index?: number;
  presentation?: 'model' | 'piece';
}) {
  const [color, setColor] = useState(productMedia(p)?.color || 'Noir');
  const reference = productMedia(p);
  const image =
    presentation === 'model'
      ? wornImage(p, color)
      : color === reference?.color
        ? p.image
        : wornImage(p, color);
  const href = '/producto/' + p.slug + '?color=' + encodeURIComponent(color);
  const [saved, setSaved] = useState(false);
  const { notify } = useAtelier();
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={href} aria-label={'Ver ' + p.name}>
          <Image
            src={image}
            alt={
              p.name +
              ' · ' +
              color +
              (presentation === 'model' && reference ? ' · en modelo' : '')
            }
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
        <Link className="product-discover" href={href}>
          DESCUBRIR LA PIEZA <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="product-caption">
        <Link href={href}>
          <h3>{p.name}</h3>
          <span>{p.category}</span>
        </Link>
        <span className="product-price">
          {money(p.price)}
          <small>COP · {p.approved ? '' : 'concepto'}</small>
        </span>
      </div>
      {reference && (
        <div className="card-variant-row">
          <div
            className="card-color-options"
            role="group"
            aria-label={'Colores de ' + p.name}
          >
            {colors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                aria-label={'Ver ' + p.name + ' en ' + c.name}
                aria-pressed={color === c.name}
                className={color === c.name ? 'selected' : ''}
                style={{ background: c.hex }}
                onClick={() => setColor(c.name)}
              />
            ))}
          </div>
          <span>{color} / XS—XL</span>
        </div>
      )}
    </article>
  );
}
