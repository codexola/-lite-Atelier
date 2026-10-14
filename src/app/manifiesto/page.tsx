import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Heart, Scissors, Earth } from 'lucide-react';
import { Newsletter } from '@/components/footer';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuestro manifiesto' };
export default async function Manifesto() {
  const text = await getContent(
    'manifesto',
    'La moda no debería decirte quién ser. Debería darte espacio para expresar quién eres.\n\nÉlite Atelier nace de esa convicción: vestirse por identidad propia, no para complacer a otros. Creemos en las piezas con carácter, en las siluetas que permiten movimiento y en los detalles que cuentan historias.\n\nNo somos una etiqueta que define a las personas. Somos un atelier de ideas, una conversación abierta entre estilo, identidad y comunidad.\n\nDesde Colombia, imaginamos una marca que conecte a personas distintas alrededor de una misma libertad: la de elegirse cada día.',
  );
  return (
    <>
      <section className="manifesto-hero">
        <Image
          src="/images/editorial.webp"
          alt="Moda como expresión de dos identidades únicas"
          fill
          priority
          sizes="100vw"
        />
        <div>
          <span className="eyebrow">LA ESENCIA DE ÉLITE ATELIER</span>
          <h1>
            No naciste para encajar.
            <br />
            <em>Naciste para ser tú.</em>
          </h1>
          <p>Más que ropa. Una manera de habitar el mundo con tu propia voz.</p>
        </div>
      </section>
      <div className="prose" style={{ textAlign: 'center' }}>
        <span className="eyebrow">NUESTRO MANIFIESTO</span>
        <h2>La libertad también se viste.</h2>
        <p className="text-area-content">{text}</p>
        <span className="signature-script" style={{ marginBottom: 30 }}>
          Your style. Your story.
        </span>
        <Link className="text-link" href="/identidad">
          Descubre tu identidad <ArrowUpRight size={15} />
        </Link>
      </div>
      <section className="manifesto-values">
        {[
          [
            Heart,
            'Identidad',
            'No diseñamos para que encajes. Imaginamos piezas que te permitan expresarte.',
          ],
          [
            Scissors,
            'Intención',
            'Cada silueta empieza con una idea. Cada detalle tiene una razón para existir.',
          ],
          [
            Earth,
            'Conexión',
            'Personas distintas, perspectivas nuevas. La creatividad crece cuando se comparte.',
          ],
        ].map(([Icon, title, description]) => {
          const C = Icon as typeof Heart;
          return (
            <div key={String(title)}>
              <C size={27} strokeWidth={1} />
              <h3>{String(title)}</h3>
              <p>{String(description)}</p>
            </div>
          );
        })}
      </section>
      <Newsletter />
    </>
  );
}
