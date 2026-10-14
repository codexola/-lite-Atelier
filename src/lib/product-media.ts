import type { Product } from './catalog';
export const sizeMeasurements: Record<
  string,
  { chest: string; waist: string; hip: string }
> = {
  XS: { chest: '80–84', waist: '60–64', hip: '86–90' },
  S: { chest: '84–88', waist: '64–68', hip: '90–94' },
  M: { chest: '88–94', waist: '68–74', hip: '94–100' },
  L: { chest: '94–100', waist: '74–80', hip: '100–106' },
  XL: { chest: '100–106', waist: '80–86', hip: '106–112' },
};
const references: Record<string, { image: string; color: string }> = {
  'blazer-noir': { image: '/images/blazer.webp', color: 'Noir' },
  'top-lumiere': { image: '/images/top.webp', color: 'Ivory' },
  'pantalon-atelier': { image: '/images/trousers.webp', color: 'Noir' },
  'vestido-silhouette': { image: '/images/dress.webp', color: 'Noir' },
  'blazer-ecru': { image: '/images/ivory-blazer.webp', color: 'Ivory' },
  'camisa-origine': { image: '/images/shirt.webp', color: 'Ivory' },
};
export function productMedia(p: Pick<Product, 'slug' | 'image'>) {
  const reference = references[p.slug];
  return reference?.image === p.image ? reference : null;
}
export function wornImage(
  p: Pick<Product, 'slug' | 'image'>,
  color: string,
  angle: string = 'front',
) {
  return productMedia(p)
    ? `/images/products/${p.slug}/${color.toLowerCase()}-${angle}.webp`
    : p.image;
}
export type ProductVariant = { size: string; color: string; stock: number };
