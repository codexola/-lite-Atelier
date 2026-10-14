import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Camera, ScanLine } from 'lucide-react';
export function SpatialStories() {
  return (
    <section className="spatial-stories">
      <div className="spatial-title" data-reveal>
        <span className="eyebrow">UN UNIVERSO QUE SE HABITA</span>
        <h2>
          La forma de vestir.
          <br />
          <em>La forma de estar.</em>
        </h2>
        <Link className="text-link" href="/universo">
          Entrar al universo Élite <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="spatial-grid">
        <Link
          className="spatial-image large"
          href="/colecciones?coleccion=Signature"
          data-reveal
          data-tilt
        >
          <Image
            src="/images/hero.webp"
            alt="Sastrería negra entre arquitectura y luz"
            fill
            sizes="(max-width:700px) 90vw, 50vw"
          />
          <span className="spatial-number">01 / ARQUITECTURA</span>
          <div>
            <h3>
              El espacio también
              <br />
              cuenta tu historia.
            </h3>
            <span>
              EXPLORAR SIGNATURE <ArrowUpRight size={16} />
            </span>
          </div>
        </Link>
        <Link
          className="spatial-image detail"
          href="/journal/pequenos-detalles"
          data-reveal
          data-tilt
        >
          <Image
            src="/images/community-2.webp"
            alt="Texturas y herramientas en el atelier"
            fill
            sizes="(max-width:700px) 90vw, 25vw"
          />
          <span className="spatial-number">02 / TEXTURA</span>
          <div>
            <h3>
              Todo empieza
              <br />
              en un detalle.
            </h3>
            <span>
              DENTRO DEL ATELIER <ArrowUpRight size={16} />
            </span>
          </div>
        </Link>
        <Link
          className="spatial-lab"
          href="/probador-virtual"
          data-reveal
          data-tilt
        >
          <div className="lab-visual">
            <span className="lab-ring ring-one" />
            <span className="lab-ring ring-two" />
            <ScanLine size={54} strokeWidth={0.8} />
            <span className="lab-glass">
              <Camera size={19} />
            </span>
          </div>
          <span className="eyebrow">03 / ÉLITE LAB</span>
          <h3>
            Una nueva forma
            <br />
            de verte.
          </h3>
          <p>
            Prueba una superposición de nuestras siluetas en tu cámara. Tu
            imagen permanece en tu dispositivo.
          </p>
          <span className="spatial-lab-action">
            ABRIR EL PROBADOR <ArrowUpRight size={17} />
          </span>
        </Link>
      </div>
    </section>
  );
}
