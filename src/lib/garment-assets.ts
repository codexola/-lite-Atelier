import type { Product } from './catalog';
import { productMedia } from './product-media';
export type GarmentRegion = 'upper' | 'lower' | 'skirt' | 'dress' | 'full';
export const garmentSpecs: Record<
  string,
  { color: string; region: GarmentRegion; sleeves: boolean }
> = {
  'blazer-noir': { color: 'Noir', region: 'upper', sleeves: true },
  'top-lumiere': { color: 'Ivory', region: 'upper', sleeves: false },
  'pantalon-atelier': { color: 'Noir', region: 'lower', sleeves: false },
  'vestido-silhouette': { color: 'Noir', region: 'dress', sleeves: false },
  'blazer-ecru': { color: 'Ivory', region: 'upper', sleeves: true },
  'camisa-origine': { color: 'Ivory', region: 'upper', sleeves: true },
  'gabardina-pluie': { color: 'Ivory', region: 'dress', sleeves: true },
  'chaqueta-cuir': { color: 'Noir', region: 'upper', sleeves: true },
  'bomber-urbain': { color: 'Taupe', region: 'upper', sleeves: true },
  'abrigo-structure': { color: 'Taupe', region: 'dress', sleeves: true },
  'chaleco-architecture': { color: 'Noir', region: 'upper', sleeves: false },
  'jersey-cashmere': { color: 'Ivory', region: 'upper', sleeves: true },
  'cardigan-studio': { color: 'Taupe', region: 'upper', sleeves: true },
  'polo-meridian': { color: 'Noir', region: 'upper', sleeves: false },
  'falda-ligne': { color: 'Noir', region: 'skirt', sleeves: false },
  'falda-plisse': { color: 'Ivory', region: 'skirt', sleeves: false },
  'mono-eclipse': { color: 'Noir', region: 'full', sleeves: false },
  'pantalon-fluide': { color: 'Ivory', region: 'lower', sleeves: false },
};
export function garmentAsset(
  p: Pick<Product, 'slug' | 'image'>,
  color: string,
) {
  const spec = garmentSpecs[p.slug];
  if (
    !spec ||
    !productColors(p).includes(color) ||
    (p.image !== `/images/garments/${p.slug}.webp` && !productMedia(p))
  )
    return null;
  return `/images/try-on/${p.slug}/${color.toLowerCase()}.webp`;
}
export function productColors(p: Pick<Product, 'slug' | 'image'>) {
  const spec = garmentSpecs[p.slug];
  return spec && p.image === `/images/garments/${p.slug}.webp`
    ? [spec.color]
    : ['Noir', 'Ivory', 'Taupe'];
}
