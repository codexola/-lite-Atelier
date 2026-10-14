'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useAtelier } from './atelier-provider';
const links = [
  ['Inicio', '/'],
  ['Colecciones', '/colecciones'],
  ['Co-creación', '/co-creacion'],
  ['Comunidad', '/comunidad'],
  ['Universo', '/universo'],
  ['Probador', '/probador-virtual'],
];
export function Header() {
  const { cart, setCartOpen } = useAtelier();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);
  return (
    <>
      <div className="announcement">
        <span>NO NACISTE PARA ENCAJAR. NACISTE PARA SER TÚ.</span>
        <Link href="/identidad">
          DESCUBRE TU IDENTIDAD <ArrowUpRight size={11} />
        </Link>
      </div>
      <header className="header">
        <button
          className="icon-button mobile-only"
          aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu size={21} />}
        </button>
        <Link className="wordmark" href="/">
          ÉLITE ATELIER<span>WEAR YOUR OWN IDENTITY</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {links.map(([label, url]) => (
            <Link
              className={pathname === url ? 'active' : ''}
              key={url}
              href={url}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-button"
            aria-label="Buscar piezas"
            aria-expanded={search}
            onClick={() => setSearch(!search)}
          >
            <Search size={19} />
          </button>
          <Link
            className="icon-button account-button"
            href="/cuenta"
            aria-label="Mi cuenta"
          >
            <UserRound size={19} />
          </Link>
          <button
            className="icon-button bag-button"
            aria-label={
              'Abrir carrito, ' +
              cart.reduce((n, i) => n + i.quantity, 0) +
              ' piezas'
            }
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={19} />
            {cart.length > 0 && (
              <span className="bag-count">
                {cart.reduce((n, i) => n + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>
      {menu && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {links.map(([label, url]) => (
            <Link key={url} href={url}>
              {label}
              <ArrowUpRight size={19} />
            </Link>
          ))}
          <Link href="/identidad">
            Descubre tu identidad <ArrowUpRight size={19} />
          </Link>
          <Link href="/cuenta">
            Mi cuenta <UserRound size={18} />
          </Link>
        </nav>
      )}
      {search && (
        <div className="search-panel">
          <form action="/colecciones">
            <label htmlFor="site-search">Encuentra tu próxima pieza</label>
            <div>
              <input
                id="site-search"
                autoFocus
                name="q"
                placeholder="Blazer, esenciales, Signature…"
              />
              <button className="icon-button" aria-label="Buscar">
                <Search size={20} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar búsqueda"
                onClick={() => setSearch(false)}
              >
                <X size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
