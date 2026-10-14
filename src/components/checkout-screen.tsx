'use client';
import { ReturnRequest } from './customer-tools';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Minus,
  Plus,
  X,
  LockKeyhole,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { api, useAtelier, track } from './atelier-provider';
import { money } from '@/lib/catalog';
import { shippingCost } from '@/lib/domain';
import { statusLabels } from './account-screen';
type Settings = { mode: string; shipping: { fee: number; freeAt: number } };
export function CartScreen({ settings }: { settings: Settings }) {
  const { cart, ready, remove, quantity } = useAtelier();
  if (!ready) return <div className="loading">Preparando tu selección…</div>;
  const subtotal = cart.reduce((a, i) => a + i.quantity * i.price, 0);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU SELECCIÓN PERSONAL</span>
        <h1>
          Piezas que se sienten <em>tuyas.</em>
        </h1>
        <p>El primer capítulo de tu próxima historia.</p>
      </div>
      <div className="page-container">
        {!cart.length ? (
          <div className="empty-state">
            <h3>Un lienzo en blanco.</h3>
            <p>Tu selección está vacía. Encuentra algo que conecte contigo.</p>
            <Link className="btn" href="/colecciones">
              EXPLORAR COLECCIÓN <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <div>
              {cart.map((i, n) => (
                <div
                  className="cart-row"
                  key={i.productId + i.color + i.size}
                  style={{ gridTemplateColumns: '100px 1fr 25px' }}
                >
                  <Link
                    href={
                      '/producto/' +
                      i.slug +
                      '?color=' +
                      encodeURIComponent(i.color) +
                      '&talla=' +
                      encodeURIComponent(i.size)
                    }
                  >
                    <img
                      src={i.image}
                      alt={i.name}
                      style={{ width: 100, height: 135 }}
                    />
                  </Link>
                  <div>
                    <Link
                      href={
                        '/producto/' +
                        i.slug +
                        '?color=' +
                        encodeURIComponent(i.color) +
                        '&talla=' +
                        encodeURIComponent(i.size)
                      }
                    >
                      {i.name}
                    </Link>
                    <p className="muted small-text">
                      Color {i.color} · Talla {i.size}
                    </p>
                    <span>{money(i.price * i.quantity)}</span>
                    <div className="quantity-control">
                      <button
                        aria-label={'Reducir ' + i.name}
                        onClick={() => quantity(n, i.quantity - 1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{i.quantity}</span>
                      <button
                        aria-label={'Aumentar ' + i.name}
                        onClick={() => quantity(n, i.quantity + 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={'Eliminar ' + i.name}
                    onClick={() => remove(n)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <Link className="back-link" href="/colecciones">
                <ArrowLeft size={13} /> Seguir explorando
              </Link>
            </div>
            <aside className="summary-card">
              <h2>Tu historia, en detalle.</h2>
              <SummaryTotals subtotal={subtotal} settings={settings} />
              {settings.mode === 'preview' && (
                <div className="preview-note">
                  El checkout está en vista previa. Los precios y el envío son
                  orientativos. No se realizará ningún cobro.
                </div>
              )}
              <Link className="btn full" href="/checkout">
                CONTINUAR AL CHECKOUT <ArrowUpRight size={16} />
              </Link>
              <p className="form-note">
                <LockKeyhole
                  size={12}
                  style={{ verticalAlign: 'middle', marginRight: 6 }}
                />{' '}
                Tus datos se utilizan para gestionar tu pedido.
              </p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
function SummaryTotals({
  subtotal,
  settings,
}: {
  subtotal: number;
  settings: Settings;
}) {
  const shipping = shippingCost(subtotal, settings.shipping);
  return (
    <div className="summary-totals">
      <div>
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <div>
        <span>
          Envío {settings.mode === 'preview' ? 'orientativo' : ''} · Colombia
        </span>
        <span>{shipping ? money(shipping) : 'Sin costo'}</span>
      </div>
      <div>
        <span>Tributos</span>
        <span>
          {settings.mode === 'preview'
            ? 'Precio de referencia, por validar'
            : 'Incluidos en el precio'}
        </span>
      </div>
      <div>
        <span>Total {settings.mode === 'preview' ? 'estimado' : ''}</span>
        <strong>{money(subtotal + shipping)}</strong>
      </div>
    </div>
  );
}
export function CheckoutScreen({ settings }: { settings: Settings }) {
  const mode = settings.mode;
  const { cart, ready, notify } = useAtelier();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [delivery, setDelivery] = useState<any[]>([]),
    [country, setCountry] = useState('CO'),
    [shippingMethod, setShippingMethod] = useState(''),
    [discountCode, setDiscountCode] = useState(''),
    [quote, setQuote] = useState<any>(null),
    [addresses, setAddresses] = useState<any[]>([]);
  useEffect(() => {
    void api('store/config')
      .then((r) => {
        setDelivery(r.shipping);
        setShippingMethod(
          r.shipping.find((m: any) => m.country === 'CO')?.id || '',
        );
      })
      .catch(() => {});
    void api('addresses')
      .then((r) => setAddresses(r.addresses))
      .catch(() => {});
  }, []);
  useEffect(() => {
    track('checkout_start');
  }, []);
  useEffect(() => {
    if (!ready) return;
    const cartKey = JSON.stringify(
      cart.map((i) => ({
        id: i.productId,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      })),
    );
    let previous;
    try {
      previous = JSON.parse(
        sessionStorage.getItem('atelier-checkout-attempt') || 'null',
      );
    } catch {}
    const nextKey =
      previous?.cartKey === cartKey ? previous.key : crypto.randomUUID();
    setKey(nextKey);
    sessionStorage.setItem(
      'atelier-checkout-attempt',
      JSON.stringify({ key: nextKey, cartKey }),
    );
  }, [cart, ready]);
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  if (!ready) return <div className="loading">Preparando el checkout…</div>;
  if (!cart.length)
    return (
      <div className="empty-state">
        <h3>Tu selección aún está vacía.</h3>
        <p>Elige una pieza antes de continuar.</p>
        <Link className="btn" href="/colecciones">
          Explorar colección
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          {mode === 'live' ? 'CHECKOUT SEGURO' : 'CHECKOUT DE PRUEBA'}
        </span>
        <h1>
          Una historia a punto <em>de empezar.</em>
        </h1>
      </div>
      <div className="page-container checkout-layout">
        <div>
          <div className="checkout-steps">
            <Link href="/carrito">01 Selección</Link>
            <span className="active">02 Tus datos</span>
            <span>03 Confirmación</span>
          </div>
          <h2>A dónde va tu historia.</h2>
          {mode !== 'live' && (
            <div className="preview-note">
              Estás probando la plataforma. No introduzcas información sensible
              real. Este pedido no genera un pago, envío ni compromiso de
              producción.
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
              if (busy) return;
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                const r = await api('checkout', {
                  email: f.get('email'),
                  name: f.get('name'),
                  address: f.get('address'),
                  city: f.get('city'),
                  postal: f.get('postal'),
                  country,
                  shippingMethod: shippingMethod || undefined,
                  discountCode: discountCode || undefined,
                  accepted: true,
                  items: cart.map((i) => ({
                    productId: i.productId,
                    size: i.size,
                    color: i.color,
                    quantity: i.quantity,
                  })),
                  idempotencyKey: key,
                });
                const attempt = JSON.parse(
                  sessionStorage.getItem('atelier-checkout-attempt') || '{}',
                );
                sessionStorage.setItem(
                  'atelier-checkout-attempt',
                  JSON.stringify({ ...attempt, orderId: r.orderId }),
                );
                window.location.assign(r.url);
              } catch (err) {
                setError((err as Error).message);
                notify((err as Error).message, true);
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label className="field full">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                />
              </label>
              <label className="field full">
                <span>Nombre completo</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label className="field full">
                <span>Dirección</span>
                <input
                  name="address"
                  required
                  minLength={5}
                  maxLength={200}
                  autoComplete="street-address"
                  placeholder="Calle, número, apartamento"
                />
              </label>
              <label className="field">
                <span>Ciudad / municipio</span>
                <input
                  name="city"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="address-level2"
                  placeholder="Bogotá"
                />
              </label>
              <label className="field">
                <span>Código postal</span>
                <input
                  name="postal"
                  required
                  minLength={2}
                  maxLength={20}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </label>
              <label className="field full">
                <span>País</span>
                <select
                  aria-label="País de entrega"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setShippingMethod(
                      delivery.find((m) => m.country === e.target.value)?.id ||
                        '',
                    );
                    setQuote(null);
                  }}
                >
                  {[...new Set(['CO', ...delivery.map((m) => m.country)])].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c === 'CO' ? 'Colombia' : c}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {addresses.length > 0 && (
              <label className="field">
                <span>Usar una dirección guardada</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const a = addresses.find((a) => a.id === e.target.value);
                    if (!a) return;
                    const form = e.currentTarget.closest('form');
                    for (const key of ['name', 'address', 'city', 'postal']) {
                      const field = form?.elements.namedItem(
                        key,
                      ) as HTMLInputElement;
                      if (field) field.value = a[key];
                    }
                    setCountry(a.country);
                    setShippingMethod(
                      delivery.find((m) => m.country === a.country)?.id || '',
                    );
                    setQuote(null);
                  }}
                >
                  <option value="">Elegir destino guardado</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} / {a.city}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>Método de entrega</span>
              <select
                aria-label="Método de entrega"
                value={shippingMethod}
                onChange={(e) => {
                  setShippingMethod(e.target.value);
                  setQuote(null);
                }}
              >
                {delivery
                  .filter((m) => m.country === country)
                  .map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name} · {m.estimate}
                    </option>
                  ))}
              </select>
            </label>
            <div className="coupon-field">
              <label className="field">
                <span>Código promocional</span>
                <input
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setQuote(null);
                  }}
                  maxLength={30}
                />
              </label>
              <button
                type="button"
                className="btn btn-outline small"
                onClick={async () => {
                  try {
                    setQuote(
                      await api('checkout/quote', {
                        country,
                        shippingMethod,
                        discountCode,
                        items: cart.map((i) => ({
                          productId: i.productId,
                          size: i.size,
                          color: i.color,
                          quantity: i.quantity,
                        })),
                      }),
                    );
                    notify('Importes verificados.');
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Aplicar y verificar
              </button>
            </div>
            <label className="checkbox-label" style={{ marginBottom: 25 }}>
              <input type="checkbox" required />
              <span>
                He leído los <Link href="/politicas/terminos">términos</Link> y
                la{' '}
                <Link href="/politicas/privacidad">política de privacidad</Link>
                .{' '}
                {mode !== 'live' &&
                  'Entiendo que este es un pedido de prueba sin cobro.'}
              </span>
            </label>
            <button className="btn full" disabled={busy || !key}>
              {busy
                ? 'PREPARANDO TU PEDIDO…'
                : mode === 'live'
                  ? 'CONTINUAR AL PAGO SEGURO'
                  : 'CONFIRMAR PEDIDO DE PRUEBA'}{' '}
              <ArrowUpRight size={16} />
            </button>
            <p className="form-note">
              {mode === 'live'
                ? 'El pago se realiza en la pasarela. No almacenamos datos de tarjetas.'
                : 'No solicitamos ni almacenamos información de tarjetas en este flujo de prueba.'}
            </p>
          </form>
        </div>
        <aside className="summary-card">
          <h2>Tu selección</h2>
          {cart.map((i) => (
            <div className="summary-item" key={i.productId + i.size + i.color}>
              <img src={i.image} alt={i.name} />
              <div>
                <h3>{i.name}</h3>
                <p>
                  {i.color} / {i.size} · {i.quantity} pieza
                  {i.quantity > 1 ? 's' : ''}
                </p>
              </div>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          {quote ? (
            <div className="summary-totals">
              <div>
                <span>Subtotal verificado</span>
                <span>{money(quote.subtotal)}</span>
              </div>
              <div>
                <span>Envío</span>
                <span>{money(quote.shipping)}</span>
              </div>
              <div>
                <span>Promoción</span>
                <span>−{money(quote.discount)}</span>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(quote.total)}</strong>
              </div>
            </div>
          ) : (
            <SummaryTotals
              subtotal={subtotal}
              settings={{
                ...settings,
                shipping: delivery.find((m) => m.id === shippingMethod)
                  ? {
                      fee: Number(
                        delivery.find((m) => m.id === shippingMethod).fee,
                      ),
                      freeAt: Number(
                        delivery.find((m) => m.id === shippingMethod).free_at,
                      ),
                    }
                  : settings.shipping,
              }}
            />
          )}
          <Link href="/carrito" className="text-link" style={{ marginTop: 15 }}>
            Editar mi selección <ArrowUpRight size={13} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function OrderScreen({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const { clear } = useAtelier();
  useEffect(() => {
    const token =
      new URLSearchParams(window.location.search).get('token') || '';
    let active = true;
    async function load() {
      try {
        const r = await api(
          'orders/' + id + '?token=' + encodeURIComponent(token),
        );
        if (active) {
          setData(r.order);
          if (
            ['preview', 'paid', 'processing', 'shipped', 'delivered'].includes(
              r.order.status,
            )
          ) {
            let attempt;
            try {
              attempt = JSON.parse(
                sessionStorage.getItem('atelier-checkout-attempt') || 'null',
              );
            } catch {}
            if (attempt?.orderId === r.order.id) {
              clear();
              sessionStorage.removeItem('atelier-checkout-attempt');
            }
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    const timer = setInterval(() => {
      void load();
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);
  if (error)
    return (
      <div className="confirmation">
        <h1>No encontramos este pedido.</h1>
        <p>{error}</p>
        <Link className="btn" href="/cuenta">
          Ir a mi cuenta
        </Link>
      </div>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Consultando tu pedido…
      </div>
    );
  return (
    <div className="page-container">
      <div className="confirmation">
        <div className="confirmation-icon">
          <Check size={25} strokeWidth={1.2} />
        </div>
        <span className="eyebrow">EA-{data.id.slice(0, 8).toUpperCase()}</span>
        <h1>
          {data.status === 'preview'
            ? 'Tu historia empieza aquí.'
            : data.status === 'pending'
              ? 'Estamos verificando tu pago.'
              : 'Gracias por elegirte.'}
        </h1>
        <p>
          {data.status === 'preview'
            ? 'Tu pedido de prueba se ha guardado correctamente. No se ha realizado ningún cobro ni se enviarán productos.'
            : data.status === 'pending'
              ? 'La confirmación de la pasarela puede tardar unos momentos. Esta página se actualiza automáticamente.'
              : 'Puedes consultar el estado de tu pedido aquí o desde tu cuenta.'}
        </p>
        <span className={'status ' + data.status}>
          {statusLabels[data.status]}
        </span>
        <div
          className="summary-card"
          style={{ position: 'static', textAlign: 'left', marginTop: 30 }}
        >
          {data.items.map((i: any) => (
            <div className="summary-item" key={i.productId + i.size + i.color}>
              <img src={i.image} alt={i.name} />
              <div>
                <h3>{i.name}</h3>
                <p>
                  {i.color} / {i.size} · {i.quantity} pieza
                  {i.quantity > 1 ? 's' : ''}
                </p>
              </div>
              <span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="summary-totals">
            <div>
              <span>Subtotal</span>
              <span>{money(data.subtotal)}</span>
            </div>
            <div>
              <span>Envío</span>
              <span>{money(data.shipping)}</span>
            </div>
            <div>
              <span>Total</span>
              <strong>{money(data.total)}</strong>
            </div>
          </div>
          {data.adjustment?.discount > 0 && (
            <p>
              Código {data.adjustment.discount_code}: −
              {money(data.adjustment.discount)}
            </p>
          )}
          {data.shipment && (
            <section className="shipment-summary">
              <h3>Tu próximo destino.</h3>
              <p>
                {data.shipment.carrier} / {data.shipment.tracking}
              </p>
              <p>Estado: {data.shipment.status}</p>
              {data.shipment.url && (
                <a
                  className="text-link"
                  href={data.shipment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Seguir mi envío <ArrowUpRight size={15} />
                </a>
              )}
            </section>
          )}
          {['paid', 'processing', 'shipped', 'delivered'].includes(
            data.status,
          ) && <ReturnRequest orderId={data.id} />}
        </div>
        <div
          className="two-buttons"
          style={{ justifyContent: 'center', marginTop: 25 }}
        >
          <Link className="btn" href="/colecciones">
            SEGUIR EXPLORANDO <ArrowUpRight size={15} />
          </Link>
          <Link className="text-link" href="/cuenta">
            Mi atelier <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
