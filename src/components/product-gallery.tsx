'use client';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minus,
  Plus,
  X,
  Move,
} from 'lucide-react';
import { type Product } from '@/lib/catalog';
import { productMedia, wornImage } from '@/lib/product-media';
import { useDialog } from './use-dialog';
const angles = [
  { id: 'front', label: 'Frente', subtitle: 'La silueta' },
  { id: 'side', label: 'Perfil', subtitle: 'La caída' },
  { id: 'back', label: 'Espalda', subtitle: 'La estructura' },
];
export function ProductGallery({
  product,
  color,
}: {
  product: Product;
  color: string;
}) {
  const reference = useMemo(() => productMedia(product), [product]);
  const customViews = product.gallery
    ?.filter((g) => !g.color || g.color === color)
    .map((g) => ({
      id: g.angle,
      label: g.label,
      subtitle: g.color || 'Vista de la pieza',
    }));
  const views = customViews?.length
    ? customViews
    : reference
      ? [
          ...angles,
          ...(color === reference.color
            ? [{ id: 'piece', label: 'La pieza', subtitle: 'Sin modelo' }]
            : []),
        ]
      : [{ id: 'piece', label: 'La pieza', subtitle: 'Vista original' }];
  const [angle, setAngle] = useState(
    customViews?.[0]?.id || (reference ? 'front' : 'piece'),
  );
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const lightboxRef = useRef<HTMLImageElement>(null);
  useDialog(open, '.piece-lightbox', () => setOpen(false));
  useEffect(() => {
    if (angle === 'piece' && reference && color !== reference.color)
      setAngle('front');
    setHover(false);
    setScale(1);
  }, [color, angle, reference]);
  const active = views.find((v) => v.id === angle) || views[0];
  const src =
    active.id === 'piece'
      ? product.image
      : wornImage(product, color, active.id);
  function position(
    e: PointerEvent<HTMLElement>,
    ref: HTMLImageElement | null,
  ) {
    if (e.pointerType !== 'mouse' || !ref) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    ref.style.transformOrigin = `${Math.max(0, Math.min(100, ((e.clientX - bounds.left) / bounds.width) * 100))}% ${Math.max(0, Math.min(100, ((e.clientY - bounds.top) / bounds.height) * 100))}%`;
  }
  function navigate(direction: number) {
    const i = views.findIndex((v) => v.id === active.id);
    setAngle(views[(i + direction + views.length) % views.length].id);
    setScale(1);
  }
  return (
    <div className="fit-gallery">
      <div className="fit-gallery-top">
        <span className="eyebrow">
          THE FIT EDIT / {product.collection.toUpperCase()}
        </span>
        <span>
          {String(views.findIndex((v) => v.id === active.id) + 1).padStart(
            2,
            '0',
          )}{' '}
          / {String(views.length).padStart(2, '0')}
        </span>
      </div>
      <div className="fit-gallery-layout">
        <div
          className="fit-thumbnails"
          role="group"
          aria-label="Vistas de la prenda"
        >
          {views.map((v) => (
            <button
              key={v.id}
              className={active.id === v.id ? 'active' : ''}
              aria-label={'Ver vista ' + v.label}
              aria-pressed={active.id === v.id}
              onClick={() => setAngle(v.id)}
            >
              <span className="fit-thumb-image">
                <Image
                  src={
                    v.id === 'piece'
                      ? product.image
                      : wornImage(product, color, v.id)
                  }
                  alt=""
                  fill
                  sizes="80px"
                />
              </span>
              <span>
                {v.label}
                <small>{v.subtitle}</small>
              </span>
            </button>
          ))}
        </div>
        <div
          className={'product-gallery fit-main ' + (hover ? 'is-hovering' : '')}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse') {
              setHover(true);
              position(e, imageRef.current);
            }
          }}
          onPointerLeave={() => setHover(false)}
        >
          <Image
            unoptimized
            ref={imageRef}
            key={src}
            src={src}
            alt={`${product.name} en ${color}, ${active.label.toLowerCase()}${active.id === 'piece' ? '' : ', en modelo'}`}
            fill
            priority
            sizes="(max-width: 700px) 80vw, (max-width: 1100px) 48vw, 44vw"
            className="fit-main-image"
          />
          <span className="fit-image-label">
            {active.id === 'piece' ? 'STILL LIFE' : 'EN MODELO'} <i />{' '}
            {color.toUpperCase()}
          </span>
          <button
            className="gallery-zoom"
            aria-label="Ampliar imagen de la pieza"
            onClick={() => {
              setOpen(true);
              setScale(1);
            }}
          >
            <Maximize2 size={17} />
          </button>
          <div className="fit-image-footer">
            <span>
              {active.label} / {color}
            </span>
            <span className="hover-instruction">
              <Move size={13} /> Pasa el cursor para ampliar
            </span>
          </div>
        </div>
      </div>
      <div className="fit-gallery-caption">
        <span>Explora la forma. Observa cada detalle.</span>
        <small>
          Fotografía conceptual generada · el ajuste real requiere validación.
        </small>
      </div>
      {open && (
        <div className="piece-lightbox-backdrop" onClick={() => setOpen(false)}>
          <div
            className="piece-lightbox fit-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={'Imagen ampliada de ' + product.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              aria-label="Cerrar imagen ampliada"
              onClick={() => setOpen(false)}
            >
              <X size={22} />
            </button>
            <div
              className="fit-lightbox-stage"
              onPointerMove={(e) => position(e, lightboxRef.current)}
            >
              <Image
                ref={lightboxRef}
                src={src}
                alt={`${product.name} · ${active.label} · ${color}`}
                fill
                sizes="90vw"
                style={{ transform: `scale(${scale})` }}
              />
            </div>
            <div className="fit-lightbox-controls">
              <button
                aria-label="Vista anterior"
                onClick={() => navigate(-1)}
                disabled={views.length === 1}
              >
                <ArrowLeft size={18} />
              </button>
              <span>
                {active.label} · {color}
              </span>
              <button
                aria-label="Vista siguiente"
                onClick={() => navigate(1)}
                disabled={views.length === 1}
              >
                <ArrowRight size={18} />
              </button>
              <button
                aria-label="Reducir zoom"
                onClick={() => setScale((s) => Math.max(1, s - 0.5))}
                disabled={scale === 1}
              >
                <Minus size={18} />
              </button>
              <span aria-live="polite">{Math.round(scale * 100)}%</span>
              <button
                aria-label="Aumentar zoom"
                onClick={() => setScale((s) => Math.min(3, s + 0.5))}
                disabled={scale === 3}
              >
                <Plus size={18} />
              </button>
            </div>
            {scale > 1 && (
              <div
                className="fit-pan-controls"
                role="group"
                aria-label="Zona ampliada"
              >
                {[
                  ['Parte superior', '50% 0%'],
                  ['Centro', '50% 50%'],
                  ['Parte inferior', '50% 100%'],
                ].map(([label, origin]) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (lightboxRef.current)
                        lightboxRef.current.style.transformOrigin = origin;
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
