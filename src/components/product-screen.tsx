'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Heart, Truck, ChevronRight } from 'lucide-react';
import { ProductGallery } from './product-gallery';
import {
  productMedia,
  sizeMeasurements,
  type ProductVariant,
} from '@/lib/product-media';
import { type Product, colors, sizes, money } from '@/lib/catalog';
import { useAtelier, api, track } from './atelier-provider';
export function ProductScreen({
  product: p,
  variants = [],
}: {
  product: Product;
  variants?: ProductVariant[];
}) {
  const { add, notify } = useAtelier();
  const [size, setSize] = useState('');
  const [color, setColor] = useState(productMedia(p)?.color || 'Noir');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    track('product_view');
    const initial = new URLSearchParams(window.location.search).get('color');
    if (initial && colors.some((c) => c.name === initial)) setColor(initial);
    const initialSize = new URLSearchParams(window.location.search).get(
      'talla',
    );
    if (initialSize && sizes.some((s) => s === initialSize))
      setSize(initialSize);
  }, []);
  return (
    <div className="product-detail">
      <ProductGallery product={p} color={color} />
      <div className="product-info">
        <div className="breadcrumbs">
          <Link href="/">Inicio</Link>
          <ChevronRight size={10} />
          <Link href="/colecciones">Colecciones</Link>
          <ChevronRight size={10} />
          <span>{p.name}</span>
        </div>
        <span className="eyebrow">{p.collection.toUpperCase()} · PIEZA 01</span>
        <h1>{p.name}</h1>
        <div className="detail-price">
          {money(p.price)}
          <small>COP {p.approved ? '' : '· precio conceptual'}</small>
        </div>
        <p className="product-description">{p.description}</p>
        {!p.approved && (
          <div className="preview-note">
            Esta pieza pertenece a nuestra colección conceptual. Puedes explorar
            el flujo de compra sin cobros ni compromisos de fabricación.
          </div>
        )}
        <div className="option-heading">
          <span>
            Color: <strong>{color}</strong>
          </span>
        </div>
        <div className="color-options">
          {colors.map((c) => (
            <button
              key={c.name}
              className={'color-option ' + (c.name === color ? 'selected' : '')}
              style={{ background: c.hex }}
              aria-label={'Color ' + c.name}
              aria-pressed={c.name === color}
              onClick={() => {
                setColor(c.name);
                if (
                  variants.length > 0 &&
                  !variants.some(
                    (v) => v.color === c.name && v.size === size && v.stock > 0,
                  )
                )
                  setSize('');
              }}
            />
          ))}
        </div>
        <div className="option-heading">
          <span>
            Talla: <strong>{size || 'Selecciona tu talla'}</strong>
          </span>
          <Link href="/guia-tallas">Guía de tallas</Link>
        </div>
        <div className="size-options">
          {sizes.map((s) => (
            <button
              key={s}
              className={size === s ? 'selected' : ''}
              aria-pressed={size === s}
              disabled={
                variants.length > 0 &&
                !variants.some(
                  (v) => v.color === color && v.size === s && v.stock > 0,
                )
              }
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {size && (
          <div className="fit-measurements" aria-live="polite">
            <span>
              Tu selección{' '}
              <strong>
                {color} / {size}
              </strong>
            </span>
            <div>
              {[
                ['Pecho', sizeMeasurements[size].chest],
                ['Cintura', sizeMeasurements[size].waist],
                ['Cadera', sizeMeasurements[size].hip],
              ].map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  {value}
                  <small>cm</small>
                </span>
              ))}
            </div>
            <small>
              Medidas corporales orientativas. La fotografía no simula cambios
              de talla.
            </small>
          </div>
        )}
        <div className="product-actions">
          <button
            className="btn"
            onClick={() => {
              if (!size) {
                notify('Selecciona una talla para añadir la pieza.', true);
                return;
              }
              if (
                variants.length > 0 &&
                !variants.some(
                  (v) => v.color === color && v.size === size && v.stock > 0,
                )
              ) {
                notify(
                  'Esta variante está agotada. Selecciona otra combinación.',
                  true,
                );
                return;
              }
              add(p, size, color);
            }}
          >
            AÑADIR A MI SELECCIÓN <ArrowUpRight size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Guardar en favoritos"
            onClick={async () => {
              try {
                const r = await api('favorites', { productId: p.id });
                setSaved(r.saved);
                notify(
                  r.saved
                    ? 'Guardado en tus favoritos.'
                    : 'Eliminado de favoritos.',
                );
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p className="product-delivery">
          <Truck size={16} /> Envíos en Colombia · condiciones por confirmar
        </p>
        <div className="accordion">
          <details open>
            <summary>Materiales & cuidado</summary>
            <div>
              {p.material}
              <br />
              Las instrucciones definitivas de cuidado se indicarán en la ficha
              comercial aprobada.
            </div>
          </details>
          <details>
            <summary>Silueta & medidas</summary>
            <div>
              {p.fit}
              <br />
              <Link href="/guia-tallas" style={{ textDecoration: 'underline' }}>
                Consulta la guía orientativa de tallas.
              </Link>
            </div>
          </details>
          <details>
            <summary>Envíos & devoluciones</summary>
            <div>
              En esta vista previa no se realizan envíos. El checkout muestra un
              cálculo orientativo para Colombia, sin cobros.{' '}
              <Link
                href="/politicas/envios"
                style={{ textDecoration: 'underline' }}
              >
                Ver condiciones.
              </Link>
            </div>
          </details>
          <details>
            <summary>El origen de esta pieza</summary>
            <div>
              Una propuesta editorial inspirada en la libertad de expresión. La
              imagen, composición y materiales son conceptuales y necesitan
              aprobación antes de su comercialización.
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
