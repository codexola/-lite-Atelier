'use client';
import { useState, useEffect } from 'react';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { ProductCard } from './product-card';
import type { Product } from '@/lib/catalog';
export function CatalogScreen({ products }: { products: Product[] }) {
  const [presentation, setPresentation] = useState<'model' | 'piece'>('model');
  const [category, setCategory] = useState('Todas');
  const [collection, setCollection] = useState('Todas');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('featured');
  const [filters, setFilters] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCollection(params.get('coleccion') || 'Todas');
    setQ(params.get('q') || '');
  }, []);
  const shown = products
    .filter(
      (p) =>
        (category === 'Todas' || p.category === category) &&
        (collection === 'Todas' || p.collection === collection) &&
        (!q ||
          (p.name + ' ' + p.category + ' ' + p.collection)
            .toLowerCase()
            .includes(q.toLowerCase())),
    )
    .sort((a, b) =>
      sort === 'low'
        ? a.price - b.price
        : sort === 'high'
          ? b.price - a.price
          : sort === 'name'
            ? a.name.localeCompare(b.name)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <div className="page-container">
      <div className="shop-view-bar">
        <span>
          THE WARDROBE / 01{' '}
          <small>Diseño que se vive. Detalles que se sienten.</small>
        </span>
        <div role="group" aria-label="Presentación de la colección">
          {[
            ['model', 'En modelo'],
            ['piece', 'La pieza'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={presentation === id}
              className={presentation === id ? 'active' : ''}
              onClick={() => setPresentation(id as 'model' | 'piece')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="catalog-bar">
        <div className="catalog-tabs">
          {[
            'Todas',
            ...Array.from(new Set(products.map((p) => p.category))),
          ].map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="catalog-tools">
          <span>{shown.length} piezas</span>
          <button
            className="text-link"
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <SlidersHorizontal size={13} /> Filtros
          </button>
          <label className="sr-only" htmlFor="sort">
            Ordenar piezas
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Destacadas</option>
            <option value="low">Precio: menor a mayor</option>
            <option value="high">Precio: mayor a menor</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>
      {filters && (
        <div className="filter-panel">
          <label className="field">
            <span>Buscar una pieza</span>
            <input
              placeholder="Nombre o colección"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Colección</span>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            >
              {['Todas', 'Signature', 'Éditions', 'Origine'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-outline small"
            onClick={() => {
              setQ('');
              setCollection('Todas');
              setCategory('Todas');
            }}
          >
            Limpiar filtros <X size={12} />
          </button>
        </div>
      )}
      {collection !== 'Todas' && (
        <div className="preview-note">
          Colección: {collection}{' '}
          <button
            onClick={() => setCollection('Todas')}
            style={{ textDecoration: 'underline', marginLeft: 15 }}
          >
            Ver todas
          </button>
        </div>
      )}
      {q && (
        <p className="page-subtitle">
          Resultados para «{q}»{' '}
          <button
            onClick={() => setQ('')}
            style={{ textDecoration: 'underline', marginLeft: 10 }}
          >
            Limpiar
          </button>
        </p>
      )}
      <div className="product-grid">
        {shown.length ? (
          shown.map((p) => (
            <ProductCard key={p.id} product={p} presentation={presentation} />
          ))
        ) : (
          <div className="empty-state">
            <Search size={27} />
            <h3 style={{ marginTop: 20 }}>Otra forma de buscar.</h3>
            <p>No encontramos piezas con estos filtros.</p>
            <button
              className="btn btn-outline"
              onClick={() => {
                setQ('');
                setCategory('Todas');
                setCollection('Todas');
              }}
            >
              Ver toda la colección
            </button>
          </div>
        )}
      </div>
      <p className="catalog-note">
        Colección conceptual · Fotografías generadas para esta propuesta. Los
        precios en COP, materiales y variantes son orientativos. La
        disponibilidad comercial se confirmará antes del lanzamiento.
      </p>
    </div>
  );
}
