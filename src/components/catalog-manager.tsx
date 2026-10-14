'use client';
import { useState } from 'react';
import { Plus, Search, Upload, X, ArrowUpRight, ImagePlus } from 'lucide-react';
import { api, useAtelier } from './atelier-provider';
import {
  type Product,
  colors,
  sizes,
  money,
  products as previewProducts,
} from '@/lib/catalog';
import { productColors } from '@/lib/garment-assets';
import { useDialog } from './use-dialog';
type Variant = {
  size: string;
  color: string;
  stock: number;
  price?: number | null;
};
const slug = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function MediaUpload({
  onUpload,
}: {
  onUpload: (src: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  return (
    <label className="admin-upload">
      <ImagePlus size={19} />
      <span>
        {busy ? 'Optimizando imágenes…' : 'Subir fotografías'}
        <small>JPG, PNG o WebP · hasta 3 MB por archivo</small>
      </span>
      <input
        aria-label="Subir imágenes de producto"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          setBusy(true);
          try {
            for (const file of files) {
              const form = new FormData();
              form.set('file', file);
              const res = await fetch('/api/admin/media', {
                method: 'POST',
                body: form,
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              onUpload(data.src, data.name);
            }
            notify('Imágenes optimizadas y guardadas.');
          } catch (err) {
            notify((err as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
export function CatalogManager({
  products,
  taxonomy,
  media,
  refresh,
}: {
  products: Product[];
  taxonomy: any[];
  media: any[];
  refresh: () => Promise<void>;
}) {
  const [q, setQ] = useState(''),
    [editing, setEditing] = useState<any>(null),
    [variants, setVariants] = useState<Variant[]>([]),
    [sizeText, setSizeText] = useState('XS,S,M,L,XL'),
    [busy, setBusy] = useState(false),
    [uploaded, setUploaded] = useState<{ src: string; name: string }[]>([]);
  const { notify } = useAtelier();
  useDialog(!!editing, '.catalog-editor', () => setEditing(null));
  async function open(p?: Product) {
    const colorOptions = p?.colorOptions?.length
      ? p.colorOptions
      : colors.filter((c) => !p || productColors(p).includes(c.name));
    setEditing(
      p
        ? {
            ...p,
            sku: p.sku || 'EA-' + p.slug.toUpperCase(),
            weight: p.weight || 500,
            colors: colorOptions,
            gallery: p.gallery || [],
          }
        : {
            id: crypto.randomUUID(),
            slug: '',
            name: '',
            category:
              taxonomy.find((t) => t.kind === 'category' && t.active)?.name ||
              'Sastrería',
            collection:
              taxonomy.find((t) => t.kind === 'collection' && t.active)?.name ||
              'Signature',
            price: 10000,
            image: '/images/blazer.webp',
            description: '',
            material: '',
            fit: '',
            sku: '',
            weight: 500,
            featured: false,
            active: false,
            approved: false,
            colors: [colors[0]],
            gallery: [],
          },
    );
    setVariants([]);
    setBusy(true);
    try {
      if (p) {
        const result = await api('admin/variants?id=' + p.id);
        setVariants(result.variants);
        setSizeText(
          [...new Set(result.variants.map((v: Variant) => v.size))].join(','),
        );
      } else {
        setVariants(
          sizes.map((size) => ({ size, color: 'Noir', stock: 0, price: null })),
        );
        setSizeText(sizes.join(','));
      }
    } catch (e) {
      notify((e as Error).message, true);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }
  function rebuild() {
    const labels = [
      ...new Set(
        sizeText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    setVariants(
      labels.flatMap((size) =>
        editing.colors.map(
          (color: any) =>
            variants.find((v) => v.size === size && v.color === color.name) || {
              size,
              color: color.name,
              stock: 0,
              price: null,
            },
        ),
      ),
    );
  }
  const shown = products.filter((p) =>
    (p.name + ' ' + (p.sku || '') + ' ' + p.category)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <section className="workspace-module">
      <div className="module-heading">
        <div>
          <span className="eyebrow">
            TU INVENTARIO / {products.length} PIEZAS
          </span>
          <h2>El catálogo.</h2>
          <p>
            Publica piezas, define variantes y construye nuevas colecciones.
          </p>
        </div>
        <button className="btn" onClick={() => void open()}>
          Nueva pieza <Plus size={16} />
        </button>
      </div>
      <label className="admin-search">
        <Search size={18} />
        <input
          aria-label="Buscar productos administrativos"
          placeholder="Buscar por pieza, SKU o categoría"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>PIEZA</th>
              <th>CATEGORÍA</th>
              <th>PRECIO</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-product-cell">
                    <img src={p.image} alt="" />
                    <span>
                      {p.name}
                      <small>{p.sku || p.slug}</small>
                    </span>
                  </div>
                </td>
                <td>
                  {p.category}
                  <small className="muted">{p.collection}</small>
                </td>
                <td>{money(p.price)}</td>
                <td>
                  <span
                    className={
                      'status-pill ' + (p.active ? 'published' : 'pending')
                    }
                  >
                    {p.active ? 'PUBLICADA' : 'BORRADOR'}
                  </span>
                </td>
                <td>
                  <button className="text-link" onClick={() => void open(p)}>
                    Editar pieza
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="empty-state">
          <h3>Tu próxima pieza empieza aquí.</h3>
          <p>Añade un producto o cambia la búsqueda.</p>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <div
            className="modal catalog-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Editar producto"
          >
            <button
              className="icon-button close"
              aria-label="Cerrar edición"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <span className="eyebrow">ATELIER / PRODUCT EDITOR</span>
            <h2>Una pieza, cada detalle.</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api('admin/catalog', { ...editing, variants });
                  await refresh();
                  setEditing(null);
                  notify('Pieza y variantes guardadas.');
                } catch (err) {
                  notify((err as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="form-grid">
                {[
                  ['name', 'Nombre'],
                  ['slug', 'URL · solo letras minúsculas y guiones'],
                  ['sku', 'SKU'],
                  ['weight', 'Peso de envío (gramos)'],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      required
                      value={editing[key]}
                      type={key === 'weight' ? 'number' : 'text'}
                      min={0}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [key]:
                            key === 'weight'
                              ? Number(e.target.value)
                              : e.target.value,
                          ...(key === 'name' && !editing.slug
                            ? { slug: slug(e.target.value) }
                            : {}),
                        })
                      }
                    />
                  </label>
                ))}
                {[
                  ['category', 'Categoría'],
                  ['collection', 'Colección'],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <select
                      aria-label={label}
                      value={editing[key]}
                      onChange={(e) =>
                        setEditing({ ...editing, [key]: e.target.value })
                      }
                    >
                      {taxonomy
                        .filter(
                          (t) =>
                            t.kind ===
                              (key === 'category'
                                ? 'category'
                                : 'collection') && t.active,
                        )
                        .map((t) => (
                          <option key={t.id}>{t.name}</option>
                        ))}
                    </select>
                  </label>
                ))}
                <label className="field">
                  <span>Precio base en COP</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editing.price / 100}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        price: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Imagen de la biblioteca</span>
                  <select
                    aria-label="Imagen de la biblioteca"
                    value={editing.image}
                    onChange={(e) =>
                      setEditing({ ...editing, image: e.target.value })
                    }
                  >
                    {Array.from(
                      new Map(
                        [
                          { src: editing.image, name: 'Imagen actual' },
                          ...previewProducts.map((p) => ({
                            src: p.image,
                            name: p.name,
                          })),
                          ...media.map((m) => ({
                            src: '/api/media/' + m.id,
                            name: m.name,
                          })),
                          ...uploaded,
                        ].map((i) => [i.src, i]),
                      ).values(),
                    ).map((i) => (
                      <option key={i.src} value={i.src}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ['description', 'Historia / descripción'],
                  ['material', 'Materiales'],
                  ['fit', 'Corte / medidas'],
                ].map(([key, label]) => (
                  <label className="field full" key={key}>
                    <span>{label}</span>
                    <textarea
                      required
                      minLength={key === 'description' ? 10 : 3}
                      value={editing[key]}
                      onChange={(e) =>
                        setEditing({ ...editing, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="editor-section">
                <h3>Fotografías y vistas</h3>
                <MediaUpload
                  onUpload={(src, name) => {
                    setUploaded((old) => [...old, { src, name }]);
                    setEditing((old: any) => ({
                      ...old,
                      image: old.gallery.length ? old.image : src,
                      gallery: [
                        ...old.gallery,
                        {
                          src,
                          label: name,
                          angle: 'view-' + crypto.randomUUID(),
                          color: '',
                        },
                      ],
                    }));
                  }}
                />
                <div className="media-grid">
                  {editing.gallery.map((g: any, i: number) => (
                    <div key={i}>
                      <img src={g.src} alt={g.label} />
                      <input
                        aria-label={'Descripción de vista ' + (i + 1)}
                        value={g.label}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            gallery: editing.gallery.map((x: any, n: number) =>
                              n === i ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label={'Color de vista ' + (i + 1)}
                        placeholder="Color (opcional)"
                        value={g.color || ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            gallery: editing.gallery.map((x: any, n: number) =>
                              n === i ? { ...x, color: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            gallery: editing.gallery.filter(
                              (_: any, n: number) => n !== i,
                            ),
                          })
                        }
                      >
                        Retirar vista
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="editor-section">
                <h3>Colores y tallas</h3>
                <div className="color-editor">
                  {editing.colors.map((color: any, i: number) => (
                    <div key={i}>
                      <input
                        type="color"
                        aria-label={'Muestra de color ' + (i + 1)}
                        value={color.hex}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            colors: editing.colors.map((x: any, n: number) =>
                              n === i ? { ...x, hex: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label={'Nombre de color ' + (i + 1)}
                        value={color.name}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            colors: editing.colors.map((x: any, n: number) =>
                              n === i ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label={'Retirar color ' + color.name}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            colors: editing.colors.filter(
                              (_: any, n: number) => n !== i,
                            ),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      colors: [
                        ...editing.colors,
                        { name: 'Nuevo color', hex: '#8390a5' },
                      ],
                    })
                  }
                >
                  Añadir color <Plus size={15} />
                </button>
                <label className="field">
                  <span>Tallas separadas por coma</span>
                  <input
                    value={sizeText}
                    onChange={(e) => setSizeText(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline small"
                  onClick={rebuild}
                >
                  Generar variantes
                </button>
              </div>
              <details open className="editor-section">
                <summary>Inventario por talla y color</summary>
                <p>
                  El precio opcional de una variante sustituye el precio base.
                </p>
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>TALLA</th>
                        <th>COLOR</th>
                        <th>STOCK</th>
                        <th>PRECIO COP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, i) => (
                        <tr key={v.size + v.color}>
                          <td>{v.size}</td>
                          <td>{v.color}</td>
                          <td>
                            <input
                              aria-label={'Stock ' + v.size + ' ' + v.color}
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) =>
                                setVariants(
                                  variants.map((x, n) =>
                                    n === i
                                      ? { ...x, stock: Number(e.target.value) }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              aria-label={'Precio ' + v.size + ' ' + v.color}
                              type="number"
                              min={1}
                              placeholder="Precio base"
                              value={v.price == null ? '' : v.price / 100}
                              onChange={(e) =>
                                setVariants(
                                  variants.map((x, n) =>
                                    n === i
                                      ? {
                                          ...x,
                                          price: e.target.value
                                            ? Math.round(
                                                Number(e.target.value) * 100,
                                              )
                                            : null,
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <div className="editor-switches">
                {[
                  ['active', 'Publicar en la tienda'],
                  ['featured', 'Destacar en portada'],
                  ['approved', 'Aprobada para venta real'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={editing[key]}
                      onChange={(e) =>
                        setEditing({ ...editing, [key]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="muted small-text">
                La aprobación requiere información comercial y stock reales. La
                vista previa continúa sin cobros.
              </p>
              <div className="editor-actions">
                <button className="btn" disabled={busy}>
                  {busy ? 'GUARDANDO…' : 'GUARDAR PIEZA'}
                  <ArrowUpRight size={15} />
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        '¿Retirar esta pieza de la tienda? Su historial se conservará.',
                      )
                    )
                      return;
                    try {
                      await api('admin/archive', { id: editing.id });
                      await refresh();
                      setEditing(null);
                    } catch (e) {
                      notify((e as Error).message, true);
                    }
                  }}
                >
                  Retirar de la tienda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
export function TaxonomyManager({
  items,
  refresh,
}: {
  items: any[];
  refresh: () => Promise<void>;
}) {
  const [kind, setKind] = useState('category'),
    [editing, setEditing] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  return (
    <section className="workspace-module">
      <div className="module-heading">
        <div>
          <span className="eyebrow">ORGANIZA TU UNIVERSO</span>
          <h2>Categorías y colecciones.</h2>
          <p>Crea agrupaciones nuevas sin modificar código.</p>
        </div>
        <button
          className="btn"
          onClick={() =>
            setEditing({
              kind,
              name: '',
              slug: '',
              description: '',
              image: '',
              active: true,
              position: items.length,
            })
          }
        >
          Nueva agrupación <Plus size={16} />
        </button>
      </div>
      <div className="segmented-control">
        {[
          ['category', 'Categorías'],
          ['collection', 'Colecciones'],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="taxonomy-grid">
        {items
          .filter((t) => t.kind === kind)
          .map((t) => (
            <article key={t.id}>
              {t.image && <img src={t.image} alt="" />}
              <span className="eyebrow">
                {t.active ? 'PUBLICADA' : 'ARCHIVADA'}
              </span>
              <h3>{t.name}</h3>
              <p>
                {t.description || 'Tu propia forma de organizar el atelier.'}
              </p>
              <button
                className="text-link"
                onClick={() => setEditing({ ...t })}
              >
                Editar agrupación <ArrowUpRight size={15} />
              </button>
            </article>
          ))}
      </div>
      {editing && (
        <form
          className="inline-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('admin/taxonomy', editing);
              setEditing(null);
              await refresh();
              notify('Agrupación guardada.');
            } catch (err) {
              notify((err as Error).message, true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>
            {editing.id ? 'Editar' : 'Crear'}{' '}
            {editing.kind === 'category' ? 'categoría' : 'colección'}
          </h3>
          <div className="form-grid">
            <label className="field">
              <span>Nombre de agrupación</span>
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: slug(e.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Identificador URL</span>
              <input
                required
                pattern="[a-z0-9-]+"
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
              />
            </label>
            <label className="field full">
              <span>Descripción de agrupación</span>
              <textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Posición de agrupación</span>
              <input
                type="number"
                min={0}
                value={editing.position}
                onChange={(e) =>
                  setEditing({ ...editing, position: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <MediaUpload
            onUpload={(src) =>
              setEditing((old: any) => ({ ...old, image: src }))
            }
          />
          {editing.image && (
            <img
              className="taxonomy-preview"
              src={editing.image}
              alt="Portada de agrupación"
            />
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) =>
                setEditing({ ...editing, active: e.target.checked })
              }
            />
            Publicar agrupación
          </label>
          <div className="editor-actions">
            <button className="btn" disabled={busy}>
              Guardar agrupación
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setEditing(null)}
            >
              Cerrar editor
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
