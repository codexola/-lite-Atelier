import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow">FUERA DEL PATRÓN · 404</span>
      <h1>
        Otro camino.
        <br />
        <em>La misma identidad.</em>
      </h1>
      <p>No encontramos esta página. Tu historia puede continuar aquí.</p>
      <Link className="btn" href="/">
        VOLVER AL INICIO <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
