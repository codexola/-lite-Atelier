import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { articles } from '@/lib/journal';
import { Newsletter } from '@/components/footer';
export const metadata = { title: 'El journal' };
export default function Journal() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">EL JOURNAL ÉLITE</span>
        <h1>
          Más allá de <em>lo que llevas.</em>
        </h1>
        <p>Ideas, perspectivas y conversaciones sobre el arte de ser tú.</p>
      </div>
      <div className="page-container">
        <div className="journal-grid">
          {articles.map((a) => (
            <Link
              key={a.slug}
              className="journal-card"
              href={'/journal/' + a.slug}
            >
              <div>
                <Image
                  src={a.image}
                  alt={a.title}
                  fill
                  sizes="(max-width:600px) 88vw,33vw"
                />
                <span className="circle-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </div>
              <span className="eyebrow">{a.tag} · 4 MIN DE LECTURA</span>
              <h3>{a.title}</h3>
              <p className="page-subtitle" style={{ marginTop: 12 }}>
                {a.intro}
              </p>
            </Link>
          ))}
        </div>
      </div>
      <Newsletter />
    </>
  );
}
