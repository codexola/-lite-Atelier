'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, X, Download, Plus } from 'lucide-react';
import { useDialog } from './use-dialog';
import { api, useAtelier } from './atelier-provider';
import {
  type Product,
  money,
  productCategories,
  products as previewProducts,
} from '@/lib/catalog';
import { statusLabels } from './account-screen';
export function LegacyAdminScreen({
  section = 'overview',
}: {
  section?: string;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(section);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const { notify } = useAtelier();
  useDialog(!!editing, '.modal', () => setEditing(null));
  useEffect(() => setTab(section), [section]);
  async function load() {
    try {
      setData(await api('admin'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (editing)
      void api('admin/variants?id=' + encodeURIComponent(editing.id))
        .then((r) => setVariants(r.variants))
        .catch(() => setVariants([]));
    else setVariants([]);
  }, [editing]);
  async function save(path: string, input: unknown) {
    setBusy(true);
    try {
      await api(path, input);
      await load();
      notify('Cambios guardados.');
      return true;
    } catch (e) {
      notify((e as Error).message, true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="confirmation">
        <h1>Un espacio reservado.</h1>
        <p>{error}</p>
        <Link href="/cuenta?next=/admin" className="btn">
          Iniciar sesión
        </Link>
      </div>
    );
  if (!data)
    return <div className="loading">Preparando la administración…</div>;
  const user = data.user;
  const tabs = [
    ['overview', 'Resumen'],
    ...(data.products ? [['products', 'Catálogo']] : []),
    ...(data.orders
      ? [
          ['orders', 'Pedidos'],
          ['leads', 'Suscripciones'],
          ['contacts', 'Mensajes'],
        ]
      : []),
    ...(data.posts
      ? [
          ['moderation', 'Moderación'],
          ['content', 'Contenidos'],
        ]
      : []),
    ...(data.users
      ? [
          ['users', 'Usuarios'],
          ['audit', 'Actividad'],
        ]
      : []),
  ];
  const realOrders = (data.orders || []).filter((o: any) =>
    ['paid', 'processing', 'shipped', 'delivered'].includes(o.status),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          GESTIÓN DEL ATELIER · {user.role.toUpperCase()}
        </span>
        <h1>
          Detrás de cada <em>historia.</em>
        </h1>
        <p>
          Catálogo, pedidos y conexiones. Un espacio para cuidar cada detalle.
        </p>
      </div>
      <div className="page-container">
        <div className="admin-tabs">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <Link
            className="text-link"
            href="/cuenta"
            style={{ marginLeft: 'auto', alignSelf: 'center' }}
          >
            Mi cuenta <ArrowUpRight size={14} />
          </Link>
        </div>
        {tab === 'overview' && (
          <>
            <h2 className="admin-title">El atelier, en perspectiva.</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Ventas confirmadas</span>
                <strong>
                  {money(
                    realOrders.reduce((a: number, o: any) => a + o.total, 0),
                  )}
                </strong>
              </div>
              <div className="stat-card">
                <span>Pedidos pagados</span>
                <strong>{realOrders.length}</strong>
              </div>
              <div className="stat-card">
                <span>Pedidos de prueba</span>
                <strong>
                  {
                    (data.orders || []).filter(
                      (o: any) => o.status === 'preview',
                    ).length
                  }
                </strong>
              </div>
              <div className="stat-card">
                <span>Contactos con consentimiento</span>
                <strong>
                  {(data.leads || []).filter((l: any) => l.consent).length}
                </strong>
              </div>
            </div>
            <div className="legal-notice">
              Las ventas reales y los pedidos de prueba se contabilizan por
              separado. El modo comercial se activa en configuración, después de
              aprobar productos, operación logística, impuestos y políticas.
            </div>
            {data.events && (
              <>
                <h2 className="admin-title" style={{ marginTop: 35 }}>
                  Actividad consentida.
                </h2>
                <div className="stats-grid">
                  {data.events.map((e: any) => (
                    <div className="stat-card" key={e.name}>
                      <span>{e.name.replaceAll('_', ' ')}</span>
                      <strong>{e.count}</strong>
                    </div>
                  ))}
                </div>
                {!data.events.length && (
                  <p className="page-subtitle">
                    No hay eventos registrados. Las métricas requieren
                    consentimiento voluntario.
                  </p>
                )}
              </>
            )}
          </>
        )}
        {tab === 'products' && (
          <>
            <div className="section-title">
              <h2>El catálogo.</h2>
              <button
                className="btn small"
                onClick={() =>
                  setEditing({
                    id: crypto.randomUUID(),
                    slug: 'nueva-pieza',
                    name: 'Nueva pieza',
                    category: 'Sastrería',
                    collection: 'Signature',
                    price: 129000000,
                    image: '/images/blazer.webp',
                    description: 'Una pieza con tu propia historia.',
                    material: 'Material por definir',
                    fit: 'Medidas por definir',
                    featured: false,
                    active: false,
                    approved: false,
                    stock: 0,
                  })
                }
              >
                Nueva pieza <Plus size={14} />
              </button>
            </div>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PIEZA</th>
                    <th>COLECCIÓN</th>
                    <th>PRECIO</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p: Product) => (
                    <tr key={p.id}>
                      <td>
                        <img src={p.image} alt="" />
                        {p.name}
                      </td>
                      <td>{p.collection}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <span className="status">
                          {!p.active
                            ? 'Oculta'
                            : p.approved
                              ? 'Aprobada'
                              : 'Conceptual'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setEditing(p)}>
                          Editar pieza
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'orders' && (
          <>
            <h2 className="admin-title">Cada pedido, una historia.</h2>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>PEDIDO / FECHA</th>
                    <th>CLIENTE</th>
                    <th>PIEZAS</th>
                    <th>TOTAL</th>
                    <th>ESTADO</th>
                    <th>ACTUALIZAR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td>
                        EA-{o.id.slice(0, 8)}
                        <br />
                        <small>{o.created_at}</small>
                      </td>
                      <td>
                        {o.name}
                        <br />
                        <small>{o.email}</small>
                      </td>
                      <td>
                        {JSON.parse(o.items)
                          .map((i: any) => i.name + ' × ' + i.quantity)
                          .join(', ')}
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <span className={'status ' + o.status}>
                          {statusLabels[o.status]}
                        </span>
                      </td>
                      <td>
                        <label>
                          <span className="sr-only">
                            Actualizar estado del pedido {o.id}
                          </span>
                          <select
                            value=""
                            disabled={busy}
                            onChange={(e) => {
                              if (e.target.value)
                                void save('admin/order', {
                                  id: o.id,
                                  status: e.target.value,
                                });
                            }}
                          >
                            <option value="">Seleccionar</option>
                            {o.status === 'paid' && (
                              <option value="processing">En preparación</option>
                            )}
                            {o.status === 'processing' && (
                              <option value="shipped">En camino</option>
                            )}
                            {o.status === 'shipped' && (
                              <option value="delivered">Entregado</option>
                            )}
                            {o.status === 'preview' && (
                              <option value="cancelled">Cancelar prueba</option>
                            )}
                          </select>
                        </label>
                        {o.status === 'pending' && (
                          <button
                            disabled={busy}
                            style={{ marginTop: 8 }}
                            onClick={() =>
                              void save('admin/reconcile', { id: o.id })
                            }
                          >
                            Conciliar pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.orders.length && (
              <p className="page-subtitle">Aún no hay pedidos.</p>
            )}
            <p className="form-note">
              Los pagos pendientes, reembolsos y cancelaciones de pedidos
              pagados se concilian en la pasarela. Nunca se marca un pedido como
              pagado desde este panel.
            </p>
          </>
        )}
        {tab === 'leads' && (
          <>
            <div className="section-title">
              <h2>El círculo crece.</h2>
              <button
                className="btn btn-outline small"
                onClick={() => {
                  const clean = (s: any) =>
                    '"' +
                    String(s ?? '')
                      .replace(/^[=+@-]/, "'")
                      .replaceAll('"', '""') +
                    '"';
                  const csv = [
                    'Correo,Nombre,Consentimiento,Origen,Fecha',
                    ...data.leads.map((l: any) =>
                      [
                        l.email,
                        l.name,
                        l.consent ? 'Sí' : 'No',
                        l.source,
                        l.created_at,
                      ]
                        .map(clean)
                        .join(','),
                    ),
                  ].join('\r\n');
                  const url = URL.createObjectURL(
                    new Blob(['\ufeff' + csv], {
                      type: 'text/csv;charset=utf-8',
                    }),
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'elite-atelier-contactos.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar CSV <Download size={14} />
              </button>
            </div>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>CORREO</th>
                    <th>NOMBRE</th>
                    <th>CONSENTIMIENTO</th>
                    <th>ORIGEN</th>
                    <th>FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((l: any) => (
                    <tr key={l.id}>
                      <td>{l.email}</td>
                      <td>{l.name || '—'}</td>
                      <td>{l.consent ? 'Activo' : 'Baja solicitada'}</td>
                      <td>{l.source}</td>
                      <td>{l.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-note">
              Solo los contactos con consentimiento activo pueden recibir
              campañas. La exportación contiene datos personales: limita el
              acceso a personal autorizado.
            </p>
          </>
        )}
        {tab === 'contacts' && (
          <>
            <h2 className="admin-title">Conversaciones del atelier.</h2>
            <div className="admin-list">
              {data.contacts.map((m: any) => (
                <article key={m.id}>
                  <span className="eyebrow">
                    {m.subject} · {m.status === 'new' ? 'NUEVO' : 'RESUELTO'}
                  </span>
                  <h3 style={{ marginTop: 15 }}>{m.name}</h3>
                  <p>
                    {m.email} · {m.created_at}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
                  <div className="inline-actions">
                    <a
                      className="btn small"
                      href={
                        'mailto:' +
                        m.email +
                        '?subject=' +
                        encodeURIComponent('Élite Atelier · ' + m.subject)
                      }
                    >
                      Responder por email
                    </a>
                    <button
                      className="btn btn-outline small"
                      disabled={busy}
                      onClick={() =>
                        void save('admin/contact', {
                          id: m.id,
                          status: m.status === 'new' ? 'resolved' : 'new',
                        })
                      }
                    >
                      {m.status === 'new' ? 'Marcar como resuelto' : 'Reabrir'}
                    </button>
                  </div>
                </article>
              ))}
              {!data.contacts.length && (
                <p className="page-subtitle">Aún no hay mensajes.</p>
              )}
            </div>
          </>
        )}
        {tab === 'moderation' && (
          <>
            <h2 className="admin-title">Un espacio que cuidamos juntos.</h2>
            <div className="admin-list">
              {['posts', 'designs', 'comments'].flatMap((type) =>
                data[type]
                  .filter((p: any) => p.status === 'pending')
                  .map((p: any) => (
                    <article key={p.id}>
                      <span className="eyebrow">
                        {type === 'posts'
                          ? 'PUBLICACIÓN'
                          : type === 'designs'
                            ? 'PROPUESTA DE DISEÑO'
                            : 'COMENTARIO'}
                      </span>
                      <h3 style={{ marginTop: 15 }}>
                        {p.title || p.name || 'Una nueva perspectiva'}
                      </h3>
                      <p>
                        {p.body ||
                          `${p.model} / ${p.material} / ${p.color} / ${p.detail} / ${p.size}`}
                      </p>
                      <div className="inline-actions">
                        <button
                          className="btn small"
                          disabled={busy}
                          onClick={() =>
                            void save('admin/moderate', {
                              id: p.id,
                              type,
                              status: 'published',
                            })
                          }
                        >
                          Publicar
                        </button>
                        <button
                          className="btn btn-outline small"
                          disabled={busy}
                          onClick={() =>
                            void save('admin/moderate', {
                              id: p.id,
                              type,
                              status: 'rejected',
                            })
                          }
                        >
                          Rechazar
                        </button>
                      </div>
                    </article>
                  )),
              )}
              {!['posts', 'designs', 'comments'].some((t) =>
                data[t].some((p: any) => p.status === 'pending'),
              ) && (
                <p className="page-subtitle">
                  Todo está al día. No hay contenido pendiente de revisión.
                </p>
              )}
            </div>
          </>
        )}
        {tab === 'content' && (
          <>
            <h2 className="admin-title">La voz de la maison.</h2>
            <p className="page-subtitle">
              Estos contenidos se reflejan en las páginas públicas. Las
              políticas necesitan revisión jurídica y datos operativos reales
              antes del lanzamiento comercial.
            </p>
            <ContentEditor data={data} busy={busy} save={save} />
          </>
        )}
        {tab === 'users' && (
          <>
            <h2 className="admin-title">Las personas detrás del atelier.</h2>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>NOMBRE</th>
                    <th>CORREO</th>
                    <th>ROL</th>
                    <th>CAMBIAR ACCESO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u: any) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <label>
                          <span className="sr-only">Rol de {u.name}</span>
                          <select
                            value={u.role}
                            disabled={busy || u.id === user.id}
                            onChange={(e) =>
                              void save('admin/role', {
                                id: u.id,
                                role: e.target.value,
                              })
                            }
                          >
                            {['customer', 'editor', 'operator', 'admin'].map(
                              (r) => (
                                <option key={r}>{r}</option>
                              ),
                            )}
                          </select>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'audit' && (
          <>
            <h2 className="admin-title">Trazabilidad del atelier.</h2>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>ACCIÓN</th>
                    <th>RECURSO</th>
                    <th>USUARIO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audit.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.created_at}</td>
                      <td>{a.action}</td>
                      <td>{a.target}</td>
                      <td>{a.user_id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Editar producto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close"
              aria-label="Cerrar edición"
              onClick={() => setEditing(null)}
            >
              <X size={19} />
            </button>
            <h2>Una pieza, cada detalle.</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const p = {
                  ...editing,
                  name: String(f.get('name')),
                  slug: String(f.get('slug')),
                  category: String(f.get('category')),
                  collection: String(f.get('collection')),
                  price: Math.round(Number(f.get('price')) * 100),
                  stock: Number(f.get('stock')),
                  image: String(f.get('image')),
                  description: String(f.get('description')),
                  material: String(f.get('material')),
                  fit: String(f.get('fit')),
                  active: f.get('active') === 'on',
                  featured: f.get('featured') === 'on',
                  approved: f.get('approved') === 'on',
                };
                if (await save('admin/product', p)) setEditing(null);
              }}
            >
              <div className="form-grid">
                <label className="field full">
                  <span>Nombre</span>
                  <input name="name" required defaultValue={editing.name} />
                </label>
                <label className="field full">
                  <span>URL · solo letras minúsculas y guiones</span>
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9-]+"
                    defaultValue={editing.slug}
                  />
                </label>
                <label className="field">
                  <span>Categoría</span>
                  <select
                    name="category"
                    aria-label="Categoría"
                    defaultValue={editing.category}
                  >
                    {productCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Colección</span>
                  <select
                    name="collection"
                    aria-label="Colección"
                    defaultValue={editing.collection}
                  >
                    {['Signature', 'Éditions', 'Origine'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Precio en COP</span>
                  <input
                    name="price"
                    type="number"
                    min={1}
                    required
                    defaultValue={editing.price / 100}
                  />
                </label>
                <label className="field">
                  <span>Stock inicial por variante</span>
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    max={10000}
                    required
                    defaultValue={editing.stock}
                  />
                </label>
                <label className="field full">
                  <span>Imagen de la biblioteca</span>
                  <select
                    name="image"
                    aria-label="Imagen de la biblioteca"
                    defaultValue={editing.image}
                  >
                    {Array.from(
                      new Set([
                        editing.image,
                        ...previewProducts.map((p) => p.image),
                      ]),
                    ).map((image) => (
                      <option key={image} value={image}>
                        {previewProducts.find((p) => p.image === image)?.name ||
                          image}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field full">
                  <span>Historia / descripción</span>
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    defaultValue={editing.description}
                  />
                </label>
                <label className="field full">
                  <span>Materiales</span>
                  <input
                    name="material"
                    required
                    defaultValue={editing.material}
                  />
                </label>
                <label className="field full">
                  <span>Corte / medidas</span>
                  <input name="fit" required defaultValue={editing.fit} />
                </label>
              </div>
              {[
                ['active', 'Visible en catálogo', editing.active],
                ['featured', 'Destacada en inicio', editing.featured],
                [
                  'approved',
                  'Aprobada para venta: inventario, imágenes y especificaciones reales',
                  editing.approved,
                ],
              ].map(([name, label, checked]) => (
                <label key={String(name)} className="checkbox-label">
                  <input
                    type="checkbox"
                    name={String(name)}
                    defaultChecked={!!checked}
                  />
                  <span>{String(label)}</span>
                </label>
              ))}
              {variants.length > 0 && (
                <details className="accordion">
                  <summary
                    style={{
                      padding: '15px 0',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Inventario por talla y color
                  </summary>
                  <div className="table-scroll">
                    <table className="admin-table" style={{ minWidth: 0 }}>
                      <thead>
                        <tr>
                          <th>TALLA</th>
                          <th>COLOR</th>
                          <th>STOCK</th>
                          <th>GUARDAR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v: any, i: number) => (
                          <tr key={v.size + v.color}>
                            <td>{v.size}</td>
                            <td>{v.color}</td>
                            <td>
                              <label>
                                <span className="sr-only">
                                  Stock {v.size} {v.color}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={10000}
                                  style={{ width: 60, padding: 5 }}
                                  value={v.stock}
                                  onChange={(e) =>
                                    setVariants((prev) =>
                                      prev.map((x, n) =>
                                        n === i
                                          ? {
                                              ...x,
                                              stock: Number(e.target.value),
                                            }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </label>
                            </td>
                            <td>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void save('admin/variant', {
                                    productId: editing.id,
                                    size: v.size,
                                    color: v.color,
                                    stock: v.stock,
                                  })
                                }
                              >
                                Guardar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <p className="form-note">
                Cambiar el stock inicial reemplaza la existencia de todas las
                tallas y colores. Usa cantidades reales; no cambies esta cifra
                mientras existan reservas de pago pendientes.
              </p>
              <button
                className="btn full"
                disabled={busy}
                style={{ marginTop: 25 }}
              >
                {busy ? 'GUARDANDO…' : 'GUARDAR PIEZA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function ContentEditor({
  data,
  busy,
  save,
}: {
  data: any;
  busy: boolean;
  save: (path: string, input: unknown) => Promise<boolean>;
}) {
  const [key, setKey] = useState('home_title');
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(data.content.find((c: any) => c.key === key)?.value || '');
  }, [key, data.content]);
  const names: Record<string, string> = {
    home_title: 'Título de inicio · dos líneas',
    home_campaign_image: 'Imagen de campaña · referencia de biblioteca',
    home_intro: 'Introducción de inicio',
    manifesto: 'Manifiesto',
    shipping_policy: 'Política de envíos',
    returns_policy: 'Política de devoluciones',
    privacy_policy: 'Política de privacidad',
    terms_policy: 'Términos',
    contact_email: 'Correo de contacto',
  };
  return (
    <form
      style={{ maxWidth: 750 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await save('admin/content', { key, value });
      }}
    >
      <label className="field">
        <span>Contenido</span>
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          {Object.entries(names).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Texto público</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          minLength={3}
          maxLength={10000}
          rows={9}
        />
      </label>
      <button className="btn" disabled={busy}>
        {busy ? 'GUARDANDO…' : 'GUARDAR CONTENIDO'} <ArrowUpRight size={15} />
      </button>
    </form>
  );
}
