import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { articles } from '@/lib/journal';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  return { title: a?.title || 'Journal', description: a?.intro };
}
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  return (
    <>
      <div className="article-heading">
        <span className="eyebrow">{a.tag} · EL JOURNAL</span>
        <h1>{a.title}</h1>
        <p>Por Élite Atelier · 4 minutos de lectura</p>
      </div>
      <div className="article-hero">
        <Image src={a.image} alt={a.title} fill priority sizes="100vw" />
      </div>
      <article className="prose">
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 26,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}
        >
          {a.intro}
        </p>
        {a.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <div
          className="two-buttons"
          style={{ justifyContent: 'space-between', marginTop: 35 }}
        >
          <Link className="back-link" href="/journal">
            <ArrowLeft size={13} /> Todas las historias
          </Link>
          <Link className="text-link" href="/comunidad">
            Conectar con la comunidad <ArrowUpRight size={14} />
          </Link>
        </div>
      </article>
    </>
  );
}
