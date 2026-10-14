import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SpatialStories } from '@/components/spatial-stories';
export const metadata = {
  title: 'El universo Élite · Luz, textura e identidad',
};
export default function Universe() {
  return (
    <>
      <section className="universe-hero">
        <Image
          src="/images/editorial.webp"
          alt="La arquitectura y la moda dialogan en el universo Élite"
          fill
          priority
          sizes="100vw"
        />
        <div>
          <span className="eyebrow">LA MAISON / ÉLITE ATELIER</span>
          <h1>
            Más que una pieza.
            <br />
            <em>Una forma de habitar.</em>
          </h1>
          <p>
            La luz, el espacio y la textura inspiran nuestra manera de entender
            el estilo. Un universo abierto a tu propia interpretación.
          </p>
          <Link className="btn btn-light" href="/manifiesto">
            LEER EL MANIFIESTO <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <SpatialStories />
      <section className="universe-editorial" data-reveal>
        <div>
          <Image
            src="/images/community-3.webp"
            alt="Una expresión de estilo en la ciudad"
            fill
            sizes="(max-width:700px) 90vw, 50vw"
          />
        </div>
        <article>
          <span className="eyebrow">LA CIUDAD COMO ATELIER</span>
          <h2>
            El mundo cambia.
            <br />
            <em>Tu identidad evoluciona.</em>
          </h2>
          <p>
            Una esquina, una conversación, un nuevo punto de vista. El estilo
            también vive fuera del armario. Descubre las historias y comparte lo
            que te inspira.
          </p>
          <Link className="text-link" href="/comunidad">
            Conectar con la comunidad <ArrowUpRight size={17} />
          </Link>
        </article>
      </section>
    </>
  );
}
