'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="not-found">
      <span className="eyebrow">UN MOMENTO EN EL ATELIER</span>
      <h1>Hagamos una pausa.</h1>
      <p>No pudimos cargar esta página. Vuelve a intentarlo en un momento.</p>
      <button className="btn" onClick={reset}>
        VOLVER A INTENTAR
      </button>
    </div>
  );
}
