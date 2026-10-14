'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  ShoppingBag,
  Heart,
  Scissors,
  UserRound,
  LogOut,
  Settings,
} from 'lucide-react';
import { api, useAtelier } from './atelier-provider';
import { type Product, money } from '@/lib/catalog';
import { ProductCard } from './product-card';
export const statusLabels: Record<string, string> = {
  preview: 'Pedido de prueba',
  pending: 'Pendiente de pago',
  paid: 'Pago confirmado',
  processing: 'En preparación',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  expired: 'Reserva vencida',
  pending_review: 'En revisión',
  published: 'Publicado',
  private: 'Privado',
  rejected: 'No aprobado',
};
export function AccountScreen({ products }: { products: Product[] }) {
  const [data, setData] = useState<any>(undefined);
  const [failed, setFailed] = useState('');
  const [register, setRegister] = useState(false);
  const [tab, setTab] = useState('orders');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { notify } = useAtelier();
  async function load() {
    try {
      setData(await api('me'));
      setFailed('');
    } catch (e) {
      setFailed((e as Error).message);
      setData({ user: null });
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (data === undefined)
    return (
      <div className="loading" role="status">
        Preparando tu espacio personal…
      </div>
    );
  if (!data.user)
    return (
      <div className="page-container">
        <div className="content-grid">
          <div className="account-welcome">
            <Image
              src="/images/hero.webp"
              alt="Tu identidad tiene un espacio en Élite Atelier"
              fill
              sizes="(max-width: 600px) 88vw, 45vw"
            />
            <div>
              <span className="eyebrow">EL CÍRCULO ÉLITE</span>
              <h2>
                Un espacio para
                <br />
                <em>ser tú.</em>
              </h2>
              <p>
                Guarda tus piezas, crea tus propuestas y comparte tu visión.
              </p>
            </div>
          </div>
          <div className="form-card">
            <div className="form-tabs">
              <button
                className={!register ? 'active' : ''}
                onClick={() => {
                  setRegister(false);
                  setError('');
                }}
              >
                Iniciar sesión
              </button>
              <button
                className={register ? 'active' : ''}
                onClick={() => {
                  setRegister(true);
                  setError('');
                }}
              >
                Crear cuenta
              </button>
            </div>
            <h2>
              {register
                ? 'Tu historia empieza aquí.'
                : 'Bienvenido a tu atelier.'}
            </h2>
            <p>
              {register
                ? 'Únete a una comunidad que celebra lo que te hace único.'
                : 'Entra a tu espacio de piezas, diseños y conexiones.'}
            </p>
            {failed && (
              <div className="form-error">
                El servicio de cuentas no está disponible: {failed}
              </div>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                const f = new FormData(e.currentTarget);
                try {
                  await api(register ? 'auth/register' : 'auth/login', {
                    name: f.get('name'),
                    email: f.get('email'),
                    password: f.get('password'),
                  });
                  const next = new URLSearchParams(window.location.search).get(
                    'next',
                  );
                  if (
                    next &&
                    [
                      '/admin',
                      '/co-creacion',
                      '/checkout',
                      '/comunidad',
                    ].includes(next)
                  ) {
                    window.location.assign(next);
                    return;
                  }
                  await load();
                  notify(
                    register
                      ? 'Tu cuenta está lista. Bienvenido al círculo.'
                      : 'Bienvenido de nuevo.',
                  );
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {register && (
                <label className="field">
                  <span>Tu nombre</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="field">
                <span>Correo electrónico</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>
                  Contraseña {register ? '· mínimo 10 caracteres' : ''}
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={register ? 10 : 1}
                  maxLength={128}
                  autoComplete={register ? 'new-password' : 'current-password'}
                />
              </label>
              {register && (
                <label className="checkbox-label" style={{ marginBottom: 20 }}>
                  <input type="checkbox" required />
                  <span>
                    Acepto los <Link href="/politicas/terminos">términos</Link>{' '}
                    y he leído la{' '}
                    <Link href="/politicas/privacidad">
                      política de privacidad
                    </Link>
                    .
                  </span>
                </label>
              )}
              <button className="btn full" disabled={busy}>
                {busy
                  ? 'UN MOMENTO…'
                  : register
                    ? 'CREAR MI CUENTA'
                    : 'ENTRAR A MI ATELIER'}{' '}
                <ArrowUpRight size={15} />
              </button>
              {!register && (
                <Link
                  href="/recuperar"
                  className="text-link"
                  style={{ marginTop: 20 }}
                >
                  He olvidado mi contraseña <ArrowUpRight size={12} />
                </Link>
              )}
              <p className="form-note">
                Tu cuenta no te suscribe a comunicaciones comerciales. El
                registro a novedades es independiente y voluntario.
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  const user = data.user;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU ESPACIO PERSONAL</span>
        <h1>
          Hola, <em>{user.name.split(' ')[0]}.</em>
        </h1>
        <p>Tu identidad, tus piezas y todo lo que aún está por crear.</p>
      </div>
      <div className="account-overview">
        {[
          ['orders', 'Tus pedidos', data.orders.length, ShoppingBag],
          ['favorites', 'Piezas guardadas', data.favorites.length, Heart],
          ['designs', 'Tu universo creativo', data.designs.length, Scissors],
        ].map(([id, label, count, Icon]) => {
          const C = Icon as typeof Heart;
          return (
            <button
              key={String(id)}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(String(id))}
            >
              <C size={22} strokeWidth={1} />
              <span>
                {String(label)}
                <small>EXPLORAR MI ATELIER</small>
              </span>
              <strong>{String(count).padStart(2, '0')}</strong>
              <ArrowUpRight size={17} />
            </button>
          );
        })}
      </div>
      <div className="page-container account-layout">
        <aside className="account-nav">
          <h3>Mi atelier</h3>
          {[
            ['orders', 'Mis pedidos', ShoppingBag],
            ['favorites', 'Mis favoritos', Heart],
            ['designs', 'Mis creaciones', Scissors],
            ['profile', 'Mi perfil', UserRound],
          ].map(([id, label, Icon]) => {
            const C = Icon as typeof ShoppingBag;
            return (
              <button
                key={String(id)}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(String(id))}
              >
                <C size={16} />
                {String(label)}
              </button>
            );
          })}
          {user.role !== 'customer' && (
            <Link href="/admin">
              <Settings size={16} /> Administración
            </Link>
          )}
          <button
            onClick={async () => {
              await api('auth/logout', {});
              await load();
            }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </aside>
        <section className="account-content">
          {tab === 'orders' && (
            <>
              <h2>Historias en camino.</h2>
              {data.orders.length ? (
                data.orders.map((o: any) => (
                  <article className="order-card" key={o.id}>
                    <header>
                      <span>EA-{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={'status ' + o.status}>
                        {statusLabels[o.status]}
                      </span>
                      <strong>{money(o.total)}</strong>
                    </header>
                    <p>
                      {new Date(o.created_at + 'Z').toLocaleDateString('es-CO')}{' '}
                      ·{' '}
                      {o.items
                        .map(
                          (i: any) => `${i.name} (${i.size}) × ${i.quantity}`,
                        )
                        .join(', ')}
                    </p>
                    <Link className="text-link" href={'/pedido/' + o.id}>
                      Ver pedido <ArrowUpRight size={13} />
                    </Link>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <ShoppingBag size={27} />
                  <h3 style={{ marginTop: 20 }}>
                    Tu próxima historia te espera.
                  </h3>
                  <p>
                    Aún no tienes pedidos. Explora las piezas conceptuales de
                    Élite.
                  </p>
                  <Link className="btn" href="/colecciones">
                    Explorar colección <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </>
          )}
          {tab === 'favorites' && (
            <>
              <h2>Las piezas que te inspiran.</h2>
              <div
                className="product-grid"
                style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}
              >
                {products
                  .filter((p) => data.favorites.includes(p.id))
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                {!data.favorites.length && (
                  <div className="empty-state">
                    <Heart size={27} />
                    <h3 style={{ marginTop: 20 }}>Encuentra tu conexión.</h3>
                    <p>Guarda tus piezas favoritas desde la colección.</p>
                    <Link className="btn" href="/colecciones">
                      Descubrir piezas
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
          {tab === 'designs' && (
            <>
              <h2>Ideas con tu firma.</h2>
              {data.designs.length ? (
                data.designs.map((d: any) => (
                  <article className="saved-design" key={d.id}>
                    <img
                      src={
                        d.model === 'Top'
                          ? '/images/top.webp'
                          : d.model === 'Pantalón'
                            ? '/images/trousers.webp'
                            : '/images/blazer.webp'
                      }
                      alt={d.model}
                    />
                    <div>
                      <h3>{d.name}</h3>
                      <p>
                        {d.model} / {d.material} / {d.color} / {d.detail} /{' '}
                        {d.size}
                      </p>
                      <span className={'status ' + d.status}>
                        {d.status === 'pending'
                          ? 'En revisión'
                          : statusLabels[d.status]}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <Scissors size={27} />
                  <h3 style={{ marginTop: 20 }}>Imagina algo propio.</h3>
                  <p>Tu primera creación puede empezar con una silueta.</p>
                  <Link className="btn" href="/co-creacion">
                    Entrar al atelier <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </>
          )}
          {tab === 'profile' && (
            <>
              <h2>Tu identidad, en tus términos.</h2>
              <div className="content-grid">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      await api('auth/profile', { name: f.get('name') });
                      await load();
                      notify('Tu nombre se ha actualizado.');
                    } catch (e) {
                      notify((e as Error).message, true);
                    }
                  }}
                >
                  <label className="field">
                    <span>Tu nombre</span>
                    <input
                      name="name"
                      defaultValue={user.name}
                      required
                      minLength={2}
                    />
                  </label>
                  <label className="field">
                    <span>Correo electrónico</span>
                    <input value={user.email} readOnly />
                  </label>
                  <button className="btn small">Guardar perfil</button>
                </form>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    try {
                      await api('auth/password', {
                        current: f.get('current'),
                        password: f.get('password'),
                      });
                      notify('Tu contraseña se ha actualizado.');
                      form.reset();
                    } catch (e) {
                      notify((e as Error).message, true);
                    }
                  }}
                >
                  <label className="field">
                    <span>Contraseña actual</span>
                    <input
                      name="current"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="field">
                    <span>Nueva contraseña · mínimo 10 caracteres</span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={10}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="btn btn-outline small">
                    Actualizar contraseña
                  </button>
                </form>
              </div>
              <p className="form-note">
                Para solicitar eliminación o exportación de tus datos, utiliza
                el canal de privacidad indicado en las políticas.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
