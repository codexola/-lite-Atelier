import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight, Scissors, Earth, Heart } from 'lucide-react';
import { getProducts, db, databaseConfigured } from '@/lib/db';
import { getTaxonomy } from '@/lib/operations';
import { getContent } from '@/lib/content';
import { collections } from '@/lib/catalog';
import { SectionTitle } from '@/components/section-title';
import { ProductCard } from '@/components/product-card';
import { Newsletter } from '@/components/footer';
import { SpatialStories } from '@/components/spatial-stories';
import { AtelierWorld } from '@/components/atelier-world';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const products = await getProducts();
  const grouping = databaseConfigured()
    ? await getTaxonomy(await db(), true)
    : [];
  const displayedCollections = grouping
    .filter((g) => g.kind === 'collection')
    .map((g) => ({
      name: String(g.name),
      description: String(g.description),
      image: String(g.image) || '/images/modern-campaign.webp',
      label: 'TU PROPIA FORMA DE SER',
    }));
  const campaignImage = await getContent(
    'home_campaign_image',
    '/images/modern-campaign.webp',
  );
  const [title, intro] = await Promise.all([
    getContent('home_title', 'Tu identidad.\nTu propia firma.'),
    getContent(
      'home_intro',
      'No te vistas para encajar. Vístete para expresar quién eres. Descubre piezas con carácter, creadas para contar tu historia.',
    ),
  ]);
  return (
    <>
      <section className="hero campaign-hero">
        <Image
          src={campaignImage}
          alt="Collage editorial Élite Atelier, sastrería negra y seda marfil"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-wash" />
        <div className="hero-content">
          <span className="eyebrow">
            <i className="line" /> EL ARTE DE SER TÚ
          </span>
          <h1>
            {title.split(/\\n|\n/).map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </h1>
          <p>{intro}</p>
          <div className="hero-ctas">
            <Link className="btn" href="/colecciones">
              EXPLORAR LA COLECCIÓN <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" href="/identidad">
              Descubre tu identidad <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="hero-bottom">
          <span>COLECCIÓN CONCEPTUAL 01 / 2026</span>
          <span>ESTILO PROPIO. SIN PERMISO.</span>
          <a href="#signature" aria-label="Descubrir las piezas">
            <ArrowRight size={19} className="rotate" />
          </a>
        </div>
        <div className="campaign-seal">
          <span>É / A</span>
          <small>
            YOUR STYLE.
            <br />
            YOUR STORY.
          </small>
        </div>
        <span className="hero-side">ÉLITE ATELIER — COLOMBIA</span>
      </section>
      <section className="brand-values">
        <div>
          <Scissors size={23} strokeWidth={1.2} />
          <span>
            Diseño con intención<small>Cada detalle cuenta una historia.</small>
          </span>
        </div>
        <div>
          <Heart size={23} strokeWidth={1.2} />
          <span>
            Tu identidad, primero
            <small>La libertad de vestir a tu manera.</small>
          </span>
        </div>
        <div>
          <Earth size={23} strokeWidth={1.2} />
          <span>
            Una comunidad sin límites
            <small>Personas distintas. Una misma visión.</small>
          </span>
        </div>
      </section>
      <AtelierWorld />
      <section className="fashion-story">
        <div>
          <span className="eyebrow">SIGNATURE / UN ATELIER EN EVOLUCIÓN</span>
          <h2>
            Una actitud.
            <br />
            <em>Infinitas formas.</em>
          </h2>
          <p>
            La sastrería, la seda y tu propia mirada. Un diálogo entre la fuerza
            de las líneas y la libertad de expresarte.
          </p>
          <Link className="btn" href="/co-creacion">
            CREAR MI EXPRESIÓN <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <Image
            src="/images/campaign.webp"
            alt="La campaña original Élite Atelier, sastrería negra y marfil"
            fill
            sizes="(max-width:700px) 88vw, 47vw"
          />
        </div>
      </section>
      <SpatialStories />
      <section id="signature" className="section">
        <SectionTitle
          eyebrow="PIEZAS QUE HABLAN DE TI"
          title="La colección Signature"
          description="Siluetas esenciales. Carácter extraordinario."
          href="/colecciones"
          link="Ver todas las piezas"
        />
        <div className="product-grid">
          {products
            .filter((p) => p.featured)
            .slice(0, 4)
            .map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
        </div>
      </section>
      <section className="section new-expressions">
        <SectionTitle
          eyebrow="EL SIGUIENTE CAPÍTULO"
          title="Nuevas formas de expresión."
          description="Punto, abrigos y siluetas para ampliar tu universo."
          href="/colecciones"
          link={'Explorar las ' + products.length + ' propuestas'}
        />
        <div className="product-grid">
          {products
            .filter((p) => p.image.startsWith('/images/garments/'))
            .sort(
              (a, b) =>
                Number(['p-ligne', 'p-echarpe'].includes(b.id)) -
                Number(['p-ligne', 'p-echarpe'].includes(a.id)),
            )
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="collection-section section">
        <SectionTitle
          eyebrow="UN UNIVERSO. INFINITAS EXPRESIONES."
          title="Encuentra tu lenguaje."
          href="/colecciones"
          link="Explorar colecciones"
        />
        <div className="collection-grid">
          {(displayedCollections.length
            ? displayedCollections
            : collections
          ).map((c, i) => (
            <Link
              key={c.name}
              className={'collection-card collection-' + i}
              href={'/colecciones?coleccion=' + encodeURIComponent(c.name)}
            >
              <Image
                src={c.image}
                alt={'Colección conceptual ' + c.name}
                fill
                sizes="(max-width: 700px) 90vw, 33vw"
              />
              <div className="collection-overlay" />
              <div className="collection-text">
                <span className="eyebrow">{c.label}</span>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <span className="circle-arrow">
                  <ArrowUpRight size={21} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="manifesto-teaser" data-reveal>
        <div className="manifesto-copy">
          <span className="eyebrow">NUESTRO MANIFIESTO</span>
          <h2>
            No naciste
            <br />
            para encajar.
            <br />
            <em>Naciste para ser tú.</em>
          </h2>
          <p>
            Creemos que la moda es una forma de expresión, no una regla que
            seguir. Una pieza puede vestir un cuerpo. El estilo cuenta una
            historia.
          </p>
          <Link className="text-link" href="/manifiesto">
            Conoce la esencia de Élite <ArrowUpRight size={16} />
          </Link>
          <span className="signature-script">Your style. Your story.</span>
        </div>
        <div className="manifesto-photo">
          <Image
            src="/images/editorial.webp"
            alt="Dos identidades, una filosofía de libertad"
            fill
            sizes="(max-width: 750px) 100vw, 50vw"
          />
          <span>LA BELLEZA DE SER DIFERENTE.</span>
        </div>
      </section>
      <section className="atelier-teaser" data-reveal>
        <div className="atelier-visual">
          <span className="eyebrow">TU ATELIER PERSONAL</span>
          <Image
            src="/images/blazer.webp"
            alt="Concepto de blazer personalizable"
            fill
            sizes="(max-width: 750px) 100vw, 50vw"
          />
          <div className="atelier-materials">
            <span>MATERIALES</span>
            <i style={{ background: '#1f1f1e' }} />
            <i style={{ background: '#e8e1d3' }} />
            <i style={{ background: '#9a8873' }} />
          </div>
          <span className="atelier-note">01 / IMAGINA · ELIGE · EXPRESA</span>
        </div>
        <div className="atelier-copy">
          <span className="eyebrow">CO-CREACIÓN ÉLITE</span>
          <h2>
            Una pieza.
            <br />
            Mil formas
            <br />
            de ser <em>tú.</em>
          </h2>
          <p>
            Explora materiales, tonos y detalles. Dale forma a una propuesta que
            exprese tu visión y compártela con la comunidad.
          </p>
          <Link className="btn btn-light" href="/co-creacion">
            ENTRAR A MI ATELIER <ArrowUpRight size={17} />
          </Link>
          <small>
            Experiencia de diseño conceptual. Sin compromiso de producción.
          </small>
        </div>
      </section>
      <section className="section identity-section">
        <div>
          <span className="eyebrow">UN MINUTO. UNA NUEVA PERSPECTIVA.</span>
          <h2>
            Tu estilo tiene una historia.
            <br />
            <em>¿Cuál es la tuya?</em>
          </h2>
        </div>
        <Link className="btn btn-outline" href="/identidad">
          DESCUBRE TU IDENTIDAD ÉLITE <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="section journal-section">
        <SectionTitle
          eyebrow="EL JOURNAL"
          title="Más allá de lo que llevas."
          href="/journal"
          link="Todas las historias"
        />
        <div className="journal-grid">
          {[
            [
              'El arte de vestir sin pedir permiso.',
              'IDENTIDAD',
              '/images/community-1.webp',
              'vestir-sin-permiso',
            ],
            [
              'La belleza está en los detalles.',
              'DENTRO DEL ATELIER',
              '/images/community-2.webp',
              'pequenos-detalles',
            ],
            [
              'Una comunidad. Infinitas maneras de ser.',
              'CONEXIONES',
              '/images/community-3.webp',
              'infinitas-identidades',
            ],
          ].map(([title, tag, image, slug]) => (
            <Link className="journal-card" key={slug} href={'/journal/' + slug}>
              <div>
                <Image
                  src={image}
                  alt={title}
                  fill
                  sizes="(max-width: 700px) 90vw, 33vw"
                />
                <span className="circle-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </div>
              <span className="eyebrow">
                {tag} <i /> 4 MIN DE LECTURA
              </span>
              <h3>{title}</h3>
            </Link>
          ))}
        </div>
      </section>
      <Newsletter />
    </>
  );
}
