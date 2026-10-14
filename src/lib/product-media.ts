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
  'blusa-echarpe': {
    image: '/images/garments/blusa-echarpe.webp',
    color: 'Ivory',
  },
  'blazer-ligne': {
    image: '/images/garments/blazer-ligne.webp',
    color: 'Noir',
  },
  'blazer-noir': { image: '/images/blazer.webp', color: 'Noir' },
  'top-lumiere': { image: '/images/top.webp', color: 'Ivory' },
  'pantalon-atelier': { image: '/images/trousers.webp', color: 'Noir' },
  'vestido-silhouette': { image: '/images/dress.webp', color: 'Noir' },
  'blazer-ecru': { image: '/images/ivory-blazer.webp', color: 'Ivory' },
  'camisa-origine': { image: '/images/shirt.webp', color: 'Ivory' },
  'gabardina-pluie': {
    image: '/images/garments/gabardina-pluie.webp',
    color: 'Ivory',
  },
  'chaqueta-cuir': {
    image: '/images/garments/chaqueta-cuir.webp',
    color: 'Noir',
  },
  'bomber-urbain': {
    image: '/images/garments/bomber-urbain.webp',
    color: 'Taupe',
  },
  'abrigo-structure': {
    image: '/images/garments/abrigo-structure.webp',
    color: 'Taupe',
  },
  'chaleco-architecture': {
    image: '/images/garments/chaleco-architecture.webp',
    color: 'Noir',
  },
  'jersey-cashmere': {
    image: '/images/garments/jersey-cashmere.webp',
    color: 'Ivory',
  },
  'cardigan-studio': {
    image: '/images/garments/cardigan-studio.webp',
    color: 'Taupe',
  },
  'polo-meridian': {
    image: '/images/garments/polo-meridian.webp',
    color: 'Noir',
  },
  'falda-ligne': { image: '/images/garments/falda-ligne.webp', color: 'Noir' },
  'falda-plisse': {
    image: '/images/garments/falda-plisse.webp',
    color: 'Ivory',
  },
  'mono-eclipse': {
    image: '/images/garments/mono-eclipse.webp',
    color: 'Noir',
  },
  'pantalon-fluide': {
    image: '/images/garments/pantalon-fluide.webp',
    color: 'Ivory',
  },
};
export function productMedia(
  p: Pick<Product, 'slug' | 'image' | 'gallery' | 'colorOptions'>,
) {
  if (p.gallery?.length)
    return {
      image: p.image,
      color: p.colorOptions?.[0]?.name || p.gallery[0].color || 'Noir',
      custom: true,
    };
  const reference = references[p.slug];
  return reference?.image === p.image ? reference : null;
}
export function wornImage(
  p: Pick<Product, 'slug' | 'image' | 'gallery'>,
  color: string,
  angle: string = 'front',
) {
  if (p.gallery?.length) {
    const view =
      p.gallery.find(
        (g) => g.angle === angle && (!g.color || g.color === color),
      ) || p.gallery.find((g) => !g.color || g.color === color);
    return view?.src || p.image;
  }
  return productMedia(p)
    ? `/images/products/${p.slug}/${color.toLowerCase()}-${angle}.webp`
    : p.image;
}
export type ProductVariant = {
  size: string;
  color: string;
  stock: number;
  price?: number | null;
};
