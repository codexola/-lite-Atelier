import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function SectionTitle({
  eyebrow,
  title,
  description,
  href,
  link,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-title" data-reveal>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {link || 'Explorar'}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
