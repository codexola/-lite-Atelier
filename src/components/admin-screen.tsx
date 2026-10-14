'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  LayoutDashboard,
  Package,
  Shapes,
  Truck,
  Users,
  Image,
  BarChart3,
  Sparkles,
  ShieldCheck,
  LogOut,
  RotateCw,
  Menu,
  X,
} from 'lucide-react';
import { api, useAtelier } from './atelier-provider';
import { CatalogManager, TaxonomyManager } from './catalog-manager';
import { OperationsManager } from './operations-manager';
import { LegacyAdminScreen } from './legacy-admin-screen';
import { money } from '@/lib/catalog';
export const adminSections: Record<string, string> = {
  overview: 'Resumen',
  products: 'Catálogo',
  taxonomy: 'Categorías',
  orders: 'Pedidos',
  shipping: 'Envíos',
  promotions: 'Promociones',
  customers: 'Clientes',
  returns: 'Devoluciones',
  media: 'Biblioteca',
  creation: 'Co-creación',
  moderation: 'Moderación',
  content: 'Contenidos',
  marketing: 'Campañas',
  leads: 'Suscripciones',
  contacts: 'Mensajes',
  reports: 'Reportes',
  users: 'Usuarios',
  security: 'Seguridad',
  audit: 'Actividad',
};
const icons: any = {
  overview: LayoutDashboard,
  products: Package,
  taxonomy: Shapes,
  shipping: Truck,
  customers: Users,
  media: Image,
  reports: BarChart3,
  creation: Sparkles,
  security: ShieldCheck,
};
export function AdminScreen({
  initialTab = 'overview',
}: {
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab),
    [base, setBase] = useState<any>(null),
    [operations, setOperations] = useState<any>(null),
    [error, setError] = useState(''),
    [menu, setMenu] = useState(false),
    [selectedOrder, setSelectedOrder] = useState<any>(null);
  const router = useRouter(),
    { notify } = useAtelier();
  useEffect(() => {
    setTab(initialTab);
    setMenu(false);
  }, [initialTab]);
  async function refresh() {
    try {
      const [a, b] = await Promise.all([api('admin'), api('admin/operations')]);
      setBase(a);
      setOperations(b);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  if (error)
    return (
      <div className="staff-error">
        <ShieldCheck />
        <h1>Un espacio reservado.</h1>
        <p>{error}</p>
        <Link className="btn" href="/admin/login">
          Acceso del equipo
        </Link>
      </div>
    );
  if (!base || !operations)
    return <div className="loading">Preparando tu centro de operaciones…</div>;
  const editor = ['admin', 'editor'].includes(base.user.role),
    operator = ['admin', 'operator'].includes(base.user.role),
    admin = base.user.role === 'admin';
  const available = Object.entries(adminSections).filter(
    ([id]) =>
      id === 'overview' ||
      id === 'security' ||
      (editor &&
        [
          'products',
          'taxonomy',
          'media',
          'creation',
          'moderation',
          'content',
        ].includes(id)) ||
      (operator &&
        [
          'orders',
          'shipping',
          'promotions',
          'customers',
          'returns',
          'marketing',
          'leads',
          'contacts',
          'reports',
        ].includes(id)) ||
      (admin && ['users', 'audit'].includes(id)),
  );
  const paid = (operations.orders || []).filter((o: any) =>
    ['paid', 'processing', 'shipped', 'delivered'].includes(o.status),
  );
  const legacy = [
    'moderation',
    'content',
    'users',
    'audit',
    'leads',
    'contacts',
  ];
  function navigate(id: string) {
    setTab(id);
    setMenu(false);
    router.push(id === 'overview' ? '/admin' : '/admin/' + id);
  }
  return (
    <div className="admin-workspace">
      <aside className={'workspace-sidebar ' + (menu ? 'open' : '')}>
        <Link href="/admin" className="workspace-brand">
          ÉLITE ATELIER<small>BUSINESS STUDIO / 01</small>
        </Link>
        <div className="workspace-label">EL ATELIER, EN TUS MANOS</div>
        <nav aria-label="Administración">
          {available.map(([id, label]) => {
            const Icon = icons[id] || Shapes;
            return (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={17} />
                <span>{label}</span>
                {tab === id && <i />}
              </button>
            );
          })}
        </nav>
        <div className="workspace-user">
          <span className="staff-avatar">{base.user.name.slice(0, 1)}</span>
          <div>
            {base.user.name}
            <small>{base.user.role}</small>
          </div>
          <button
            aria-label="Cerrar sesión del equipo"
            onClick={async () => {
              await api('staff/logout', {});
              router.replace('/admin/login');
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="workspace-scrim"
          aria-label="Cerrar navegación del equipo"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-body">
        <header className="workspace-topbar">
          <button
            className="icon-button workspace-menu"
            aria-label="Abrir navegación del equipo"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <span>
            WORKSPACE <i>/</i> {adminSections[tab] || 'Resumen'}
          </span>
          <div>
            <button
              className="text-link"
              onClick={() => void refresh()}
              aria-label="Actualizar administración"
            >
              <RotateCw size={15} />
              Actualizar
            </button>
            <Link href="/" className="text-link">
              Ver tienda <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        <div className="workspace-content">
          {tab === 'overview' && (
            <>
              <div className="workspace-welcome">
                <span className="eyebrow">TU VISIÓN. TU OPERACIÓN.</span>
                <h1>
                  Detrás de cada <em>historia.</em>
                </h1>
                <p>
                  Un atelier conectado: piezas, personas y decisiones en un
                  mismo lugar.
                </p>
                <span className="workspace-status">
                  <i />
                  Sistema conectado · {new Date().toLocaleDateString('es-CO')}
                </span>
              </div>
              <div className="workspace-stats">
                <article>
                  <span>Ventas confirmadas</span>
                  <strong>
                    {money(
                      paid.reduce(
                        (n: number, o: any) => n + Number(o.total),
                        0,
                      ),
                    )}
                  </strong>
                  <small>Pedidos pagados · COP</small>
                </article>
                <article>
                  <span>Pedidos pagados</span>
                  <strong>{paid.length}</strong>
                  <small>
                    {
                      paid.filter((o: any) =>
                        ['paid', 'processing'].includes(o.status),
                      ).length
                    }{' '}
                    pendientes de despacho
                  </small>
                </article>
                <article>
                  <span>Piezas en catálogo</span>
                  <strong>{base.products?.length || 0}</strong>
                  <small>
                    {(base.products || []).filter((p: any) => p.active).length}{' '}
                    publicadas
                  </small>
                </article>
                <article>
                  <span>Conexiones activas</span>
                  <strong>
                    {(base.leads || []).filter((l: any) => l.consent).length}
                  </strong>
                  <small>Contactos con consentimiento</small>
                </article>
              </div>
              <div className="workspace-feature-grid">
                <article className="workspace-feature dark">
                  <Sparkles size={30} />
                  <span className="eyebrow">EL PRÓXIMO CAPÍTULO</span>
                  <h2>
                    Una colección
                    <br />
                    <em>empieza contigo.</em>
                  </h2>
                  <p>
                    Sube fotografías, crea categorías y lleva nuevas piezas a la
                    tienda.
                  </p>
                  {editor && (
                    <button
                      className="btn btn-light"
                      onClick={() => navigate('products')}
                    >
                      GESTIONAR CATÁLOGO <ArrowUpRight size={16} />
                    </button>
                  )}
                </article>
                <article className="workspace-feature">
                  <h3>Tu operación, hoy.</h3>
                  {[
                    [
                      'Piezas en borrador',
                      (base.products || []).filter((p: any) => !p.active)
                        .length,
                    ],
                    [
                      'Pedidos de prueba',
                      (operations.orders || []).filter(
                        (o: any) => o.status === 'preview',
                      ).length,
                    ],
                    [
                      'Solicitudes de devolución',
                      (operations.returns || []).filter(
                        (r: any) => r.status === 'requested',
                      ).length,
                    ],
                    ['Propuestas compartidas', (base.designs || []).length],
                  ].map(([name, value]) => (
                    <div className="operation-row" key={String(name)}>
                      <span>{name}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                  <p className="muted small-text">
                    Las ventas reales se contabilizan por separado de los
                    pedidos de prueba.
                  </p>
                </article>
              </div>
            </>
          )}
          {tab === 'products' && editor && (
            <CatalogManager
              products={base.products}
              taxonomy={operations.taxonomy}
              media={operations.media}
              refresh={refresh}
            />
          )}
          {tab === 'taxonomy' && editor && (
            <TaxonomyManager items={operations.taxonomy} refresh={refresh} />
          )}
          {legacy.includes(tab) && (
            <div className="legacy-admin">
              <LegacyAdminScreen key={tab} section={tab} />
            </div>
          )}
          {[
            'shipping',
            'promotions',
            'customers',
            'returns',
            'marketing',
            'reports',
            'media',
            'creation',
            'security',
          ].includes(tab) && (
            <OperationsManager
              key={tab}
              section={tab}
              data={operations}
              base={base}
              refresh={refresh}
            />
          )}
          {tab === 'orders' && operator && (
            <section className="workspace-module">
              <div className="module-heading">
                <div>
                  <span className="eyebrow">
                    DEL PEDIDO A SU PRÓXIMO DESTINO
                  </span>
                  <h2>Los pedidos.</h2>
                  <p>
                    Direcciones, piezas, pagos y seguimiento con historial
                    preservado.
                  </p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>PEDIDO</th>
                      <th>CLIENTE</th>
                      <th>TOTAL</th>
                      <th>ESTADO</th>
                      <th>DETALLES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(operations.orders || []).map((o: any) => (
                      <tr key={o.id}>
                        <td>
                          {o.id.slice(0, 8)}
                          <small className="muted">
                            {new Date(o.created_at).toLocaleDateString('es-CO')}
                          </small>
                        </td>
                        <td>
                          {o.name}
                          <small className="muted">{o.email}</small>
                        </td>
                        <td>{money(o.total)}</td>
                        <td>
                          <span className="status-pill">{o.status}</span>
                        </td>
                        <td>
                          <button
                            className="text-link"
                            onClick={() => setSelectedOrder(o)}
                          >
                            Ver pedido
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedOrder && (
                <article className="inline-editor order-detail">
                  <span className="eyebrow">PEDIDO / {selectedOrder.id}</span>
                  <h3>{selectedOrder.name}</h3>
                  <p>
                    {selectedOrder.email}
                    <br />
                    {selectedOrder.address}
                    <br />
                    {selectedOrder.city} / {selectedOrder.postal} /{' '}
                    {selectedOrder.country}
                  </p>
                  <div className="order-items">
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div className="operation-row" key={i}>
                        <img src={item.image} alt="" />
                        <span>
                          {item.name}
                          <small>
                            {item.color} / {item.size} · {item.quantity}{' '}
                            unidades
                          </small>
                        </span>
                        <strong>{money(item.price * item.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <p>
                    Total: <strong>{money(selectedOrder.total)}</strong>
                  </p>
                  <div className="editor-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => window.print()}
                    >
                      Imprimir lista de preparación
                    </button>
                    <button
                      className="text-link"
                      onClick={() => setSelectedOrder(null)}
                    >
                      Cerrar pedido
                    </button>
                  </div>
                  <div className="editor-actions">
                    {selectedOrder.status === 'preview' && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            await api('admin/order', {
                              id: selectedOrder.id,
                              status: 'cancelled',
                            });
                            await refresh();
                            setSelectedOrder(null);
                          } catch (e) {
                            notify((e as Error).message, true);
                          }
                        }}
                      >
                        Cancelar pedido de prueba
                      </button>
                    )}
                    {selectedOrder.status === 'paid' && (
                      <button
                        className="btn"
                        onClick={async () => {
                          try {
                            await api('admin/order', {
                              id: selectedOrder.id,
                              status: 'processing',
                            });
                            await refresh();
                            setSelectedOrder({
                              ...selectedOrder,
                              status: 'processing',
                            });
                          } catch (e) {
                            notify((e as Error).message, true);
                          }
                        }}
                      >
                        Preparar pedido
                      </button>
                    )}
                    {selectedOrder.status === 'pending' && (
                      <button
                        className="btn"
                        onClick={async () => {
                          try {
                            await api('admin/reconcile', {
                              id: selectedOrder.id,
                            });
                            await refresh();
                          } catch (e) {
                            notify((e as Error).message, true);
                          }
                        }}
                      >
                        Conciliar pago
                      </button>
                    )}
                    <button
                      className="text-link"
                      onClick={() => navigate('shipping')}
                    >
                      Gestionar envío <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              )}
            </section>
          )}
        </div>
        <footer className="workspace-footer">
          <span>ÉLITE ATELIER / BUSINESS STUDIO</span>
          <span>Tu identidad. Tu visión. Tu operación.</span>
        </footer>
      </div>
    </div>
  );
}
