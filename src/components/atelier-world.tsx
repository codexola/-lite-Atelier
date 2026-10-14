'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
const silhouettes = [
  {
    name: 'Blazer',
    image: '/images/blazer.webp',
    note: 'Estructura con carácter',
  },
  { name: 'Top', image: '/images/top.webp', note: 'Movimiento y luz' },
  {
    name: 'Pantalón',
    image: '/images/trousers.webp',
    note: 'Libertad en cada línea',
  },
];
export function AtelierWorld() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="world-section" aria-labelledby="world-title">
      <div className="world-heading">
        <span className="eyebrow">MÁS QUE MODA. UN UNIVERSO PROPIO.</span>
        <h2 id="world-title">
          Tu estilo empieza con <em>una idea.</em>
        </h2>
        <p>Descubre, transforma y comparte. Todo conecta contigo.</p>
      </div>
      <div className="world-grid">
        <article className="world-studio">
          <div className="world-card-heading">
            <span className="eyebrow">01 / CO-CREACIÓN</span>
            <Sparkles size={18} />
          </div>
          <h3>Tu visión. Tu pieza.</h3>
          <p>Empieza por la silueta. Hazla tuya en el atelier.</p>
          <div className="world-configurator">
            <div className="world-models">
              {silhouettes.map((s, i) => (
                <button
                  key={s.name}
                  aria-label={'Explorar silueta ' + s.name}
                  aria-pressed={selected === i}
                  className={selected === i ? 'active' : ''}
                  onClick={() => setSelected(i)}
                >
                  <Image src={s.image} alt="" width={60} height={76} />
                  {selected === i && <Check size={12} />}
                </button>
              ))}
            </div>
            <div className="world-piece">
              <Image
                src={silhouettes[selected].image}
                alt={'Silueta conceptual ' + silhouettes[selected].name}
                fill
                sizes="(max-width: 650px) 65vw, 25vw"
              />
              <span>
                {silhouettes[selected].name}
                <small>{silhouettes[selected].note}</small>
              </span>
            </div>
          </div>
          <Link
            href={
              '/co-creacion?modelo=' +
              encodeURIComponent(silhouettes[selected].name)
            }
            className="world-action"
          >
            ABRIR MI DESIGN STUDIO <ArrowUpRight size={17} />
          </Link>
        </article>
        <Link href="/colecciones" className="world-collection">
          <Image
            src="/images/editorial.webp"
            alt="Sastrería negra e ivory, dos expresiones de la colección"
            fill
            sizes="(max-width: 650px) 90vw, 35vw"
          />
          <div className="world-photo-copy">
            <span className="eyebrow">02 / COLECCIONES</span>
            <h3>
              Distintas formas.
              <br />
              <em>Una misma actitud.</em>
            </h3>
            <span className="world-action">
              DESCUBRIR SIGNATURE <ArrowUpRight size={17} />
            </span>
          </div>
        </Link>
        <article className="world-community">
          <div className="world-card-heading">
            <span className="eyebrow">03 / COMUNIDAD</span>
            <span className="world-dot" />
          </div>
          <h3>El estilo se comparte.</h3>
          <p>Personas que inspiran. Historias que conectan.</p>
          <div className="world-mosaic">
            {[1, 3, 2].map((i) => (
              <Image
                key={i}
                src={'/images/community-' + i + '.webp'}
                alt={
                  i === 2
                    ? 'Texturas del atelier'
                    : 'Editorial de la comunidad Élite'
                }
                width={280}
                height={350}
              />
            ))}
          </div>
          <div className="world-community-note">
            <span className="world-avatar">É</span>
            <span>
              Tu identidad tiene un lugar aquí.
              <small>Inspírate · Conecta · Crea</small>
            </span>
          </div>
          <Link href="/comunidad" className="world-action">
            EXPLORAR EL CÍRCULO <ArrowUpRight size={17} />
          </Link>
        </article>
      </div>
    </section>
  );
}
