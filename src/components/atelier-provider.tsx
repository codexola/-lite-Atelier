'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { X, Check, AlertCircle, ArrowUpRight, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useDialog } from './use-dialog';
import { money, type Product } from '@/lib/catalog';
export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
};
type Store = {
  cart: CartItem[];
  add: (product: Product, size: string, color: string) => void;
  remove: (index: number) => void;
  quantity: (index: number, value: number) => void;
  clear: () => void;
  notify: (message: string, error?: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  consent: string;
  setConsent: (value: string) => void;
  ready: boolean;
};
const Context = createContext<Store | null>(null);
export async function api<T = any>(path: string, data?: unknown): Promise<T> {
  const res = await fetch('/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok)
    throw new Error(result.error || 'No pudimos completar la solicitud.');
  return result;
}
export function track(name: string) {
  if (localStorage.getItem('atelier-consent') === 'all')
    void api('events', { name, consent: true }).catch(() => {});
}
export function useAtelier() {
  const store = useContext(Context);
  if (!store) throw new Error('Provider required');
  return store;
}
export function AtelierProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [consent, setConsentValue] = useState('');
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('atelier-cart') || '[]');
      if (Array.isArray(saved))
        setCart(
          saved.filter(
            (i) =>
              typeof i.productId === 'string' &&
              typeof i.price === 'number' &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 10,
          ),
        );
      setConsentValue(localStorage.getItem('atelier-consent') || '');
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem('atelier-cart', JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  useDialog(cartOpen, '.cart-drawer', () => setCartOpen(false));
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  function add(p: Product, size: string, color: string) {
    setCart((prev) => {
      const index = prev.findIndex(
        (i) => i.productId === p.id && i.size === size && i.color === color,
      );
      if (index >= 0)
        return prev.map((i, n) =>
          n === index ? { ...i, quantity: Math.min(10, i.quantity + 1) } : i,
        );
      return [
        ...prev,
        {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          image: p.image,
          price: p.price,
          size,
          color,
          quantity: 1,
        },
      ];
    });
    track('add_to_cart');
    setCartOpen(true);
  }
  function setConsent(value: string) {
    localStorage.setItem('atelier-consent', value);
    setConsentValue(value);
  }
  const value: Store = {
    cart,
    ready,
    add,
    remove: (index) => setCart((p) => p.filter((_, n) => n !== index)),
    quantity: (index, q) =>
      setCart((p) =>
        p.map((i, n) =>
          n === index ? { ...i, quantity: Math.min(10, Math.max(1, q)) } : i,
        ),
      ),
    clear: () => setCart([]),
    notify,
    cartOpen,
    setCartOpen,
    consent,
    setConsent,
  };
  return (
    <Context.Provider value={value}>
      {children}
      {toast && (
        <div className={'toast ' + (toast.error ? 'error' : '')} role="status">
          {toast.error ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {ready && !consent && (
        <div className="cookie-banner">
          <div>
            <strong>Tu privacidad también es parte de tu identidad.</strong>
            <p>
              Usamos almacenamiento esencial para tu carrito. Las métricas
              opcionales solo se activan si lo eliges.{' '}
              <Link href="/politicas/privacidad">Política de privacidad</Link>
            </p>
          </div>
          <div className="cookie-actions">
            <button
              className="btn btn-outline small"
              onClick={() => setConsent('essential')}
            >
              Solo esenciales
            </button>
            <button className="btn small" onClick={() => setConsent('all')}>
              Aceptar métricas
            </button>
          </div>
        </div>
      )}
      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Tu selección"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-heading">
              <h2>
                Tu selección{' '}
                <span>({cart.reduce((a, i) => a + i.quantity, 0)})</span>
              </h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="Cerrar carrito"
                onClick={() => setCartOpen(false)}
              >
                <X />
              </button>
            </div>
            <p className="muted small-text">Piezas que hablan de ti.</p>
            {!cart.length ? (
              <div className="empty-state">
                <h3>El principio de tu historia.</h3>
                <p>Encuentra una pieza que se sienta tuya.</p>
                <Link
                  className="btn"
                  href="/colecciones"
                  onClick={() => setCartOpen(false)}
                >
                  Explorar piezas <ArrowUpRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                <div className="drawer-items">
                  {cart.map((i, n) => (
                    <div
                      className="cart-row"
                      key={i.productId + i.size + i.color}
                    >
                      <img src={i.image} alt={i.name} />
                      <div>
                        <Link
                          href={'/producto/' + i.slug}
                          onClick={() => setCartOpen(false)}
                        >
                          {i.name}
                        </Link>
                        <p className="muted small-text">
                          {i.color} / {i.size}
                        </p>
                        <span>{money(i.price)}</span>
                        <div className="quantity-control">
                          <button
                            aria-label={'Reducir cantidad de ' + i.name}
                            onClick={() => value.quantity(n, i.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span>{i.quantity}</span>
                          <button
                            aria-label={'Aumentar cantidad de ' + i.name}
                            onClick={() => value.quantity(n, i.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={'Eliminar ' + i.name}
                        onClick={() => value.remove(n)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="drawer-bottom">
                  <div className="total-line">
                    <span>Subtotal</span>
                    <strong>
                      {money(
                        cart.reduce((a, i) => a + i.price * i.quantity, 0),
                      )}
                    </strong>
                  </div>
                  <p className="muted small-text">
                    Catálogo conceptual. Sin cobros en modo vista previa.
                  </p>
                  <Link
                    className="btn full"
                    href="/carrito"
                    onClick={() => setCartOpen(false)}
                  >
                    Ver mi selección <ArrowUpRight size={16} />
                  </Link>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </Context.Provider>
  );
}
