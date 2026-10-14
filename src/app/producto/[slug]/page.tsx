import { getProducts } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductScreen } from '@/components/product-screen';
import { ProductCard } from '@/components/product-card';
import { SectionTitle } from '@/components/section-title';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = (await getProducts()).find((p) => p.slug === slug);
  return { title: p?.name || 'Pieza Élite', description: p?.description };
}
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await getProducts();
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <>
      <ProductScreen product={p} />
      <section
        className="section"
        style={{ paddingTop: 30, borderTop: '1px solid var(--line)' }}
      >
        <SectionTitle
          eyebrow="EL ARTE DE COMBINAR"
          title="Tu historia continúa."
        />
        <div className="product-grid">
          {products
            .filter((item) => item.id !== p.id)
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
        </div>
      </section>
    </>
  );
}
