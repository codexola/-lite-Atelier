export const sizes = ['XS', 'S', 'M', 'L', 'XL'] as const;
export const colors = [
  { name: 'Noir', hex: '#20201f' },
  { name: 'Ivory', hex: '#e8e1d6' },
  { name: 'Taupe', hex: '#8e7a68' },
];
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  collection: string;
  price: number;
  image: string;
  description: string;
  material: string;
  fit: string;
  featured: boolean;
  active: boolean;
  approved: boolean;
  stock: number;
};
export const products: Product[] = [
  {
    id: 'p-noir',
    slug: 'blazer-noir',
    name: 'Blazer Noir',
    category: 'Sastrería',
    collection: 'Signature',
    price: 129000000,
    image: '/images/blazer.webp',
    description:
      'Una silueta que no pide permiso. Hombros definidos, líneas puras y una caída que transforma lo cotidiano en una declaración personal.',
    material: 'Concepto: lana de sastrería y forro de viscosa.',
    fit: 'Corte relajado. Hombro estructurado. Largo a la cadera.',
    featured: true,
    active: true,
    approved: false,
    stock: 20,
  },
  {
    id: 'p-lumiere',
    slug: 'top-lumiere',
    name: 'Top Lumière',
    category: 'Esenciales',
    collection: 'Signature',
    price: 72000000,
    image: '/images/top.webp',
    description:
      'La luz, hecha movimiento. Un top de tacto suave y drapeado fluido para acompañar tu forma de estar en el mundo.',
    material: 'Concepto: satén de seda con acabado mate.',
    fit: 'Corte fluido. Escote drapeado. Tirantes ajustables.',
    featured: true,
    active: true,
    approved: false,
    stock: 20,
  },
  {
    id: 'p-atelier',
    slug: 'pantalon-atelier',
    name: 'Pantalón Atelier',
    category: 'Sastrería',
    collection: 'Signature',
    price: 89000000,
    image: '/images/trousers.webp',
    description:
      'Equilibrio entre carácter y libertad. Tiro alto, pinzas sutiles y una pierna amplia que se mueve contigo.',
    material: 'Concepto: mezcla de lana de sastrería.',
    fit: 'Tiro alto. Pierna amplia. Largo completo.',
    featured: true,
    active: true,
    approved: false,
    stock: 20,
  },
  {
    id: 'p-silhouette',
    slug: 'vestido-silhouette',
    name: 'Vestido Silhouette',
    category: 'Vestidos',
    collection: 'Éditions',
    price: 154000000,
    image: '/images/dress.webp',
    description:
      'Menos ruido. Más presencia. Una pieza escultórica que encuentra su fuerza en la simplicidad.',
    material: 'Concepto: crepé de viscosa de tacto suave.',
    fit: 'Silueta recta. Escote asimétrico. Largo midi.',
    featured: true,
    active: true,
    approved: false,
    stock: 12,
  },
  {
    id: 'p-ecru',
    slug: 'blazer-ecru',
    name: 'Blazer Écru',
    category: 'Sastrería',
    collection: 'Signature',
    price: 137000000,
    image: '/images/ivory-blazer.webp',
    description:
      'Una nueva manera de entender la sastrería. El tono cálido y la estructura ligera dan espacio a tu identidad.',
    material: 'Concepto: lino y algodón con forro ligero.',
    fit: 'Corte relajado. Cierre cruzado. Hombro natural.',
    featured: false,
    active: true,
    approved: false,
    stock: 15,
  },
  {
    id: 'p-origine',
    slug: 'camisa-origine',
    name: 'Camisa Origine',
    category: 'Esenciales',
    collection: 'Origine',
    price: 64000000,
    image: '/images/shirt.webp',
    description:
      'Tu punto de partida. Una camisa esencial de proporciones generosas, diseñada para combinar a tu manera.',
    material: 'Concepto: popelín de algodón.',
    fit: 'Corte oversize. Puño ancho. Bajo curvo.',
    featured: false,
    active: true,
    approved: false,
    stock: 25,
  },
];
export function money(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
export const collections = [
  {
    name: 'Signature',
    label: 'LA ESENCIA DE ÉLITE',
    description: 'Líneas atemporales. Una presencia inolvidable.',
    image: '/images/signature.webp',
  },
  {
    name: 'Éditions',
    label: 'EXPRESIONES SINGULARES',
    description: 'Conceptos que exploran nuevas formas de ser.',
    image: '/images/editions.webp',
  },
  {
    name: 'Origine',
    label: 'EL PRINCIPIO DE TODO',
    description: 'Esenciales que se convierten en tu lenguaje.',
    image: '/images/origine.webp',
  },
];
export const styleProfiles = [
  {
    name: 'La esencia minimalista',
    tag: 'MENOS, PERO CON INTENCIÓN',
    description:
      'Encuentras tu fuerza en las líneas puras y los detalles que cuentan. Tu estilo habla con calma y seguridad.',
    collection: 'Origine',
    image: '/images/origine.webp',
  },
  {
    name: 'El espíritu audaz',
    tag: 'TU PRESENCIA, TU FIRMA',
    description:
      'Tu estilo no necesita permiso. Siluetas definidas y contrastes que reflejan tu manera de ver el mundo.',
    collection: 'Éditions',
    image: '/images/editions.webp',
  },
  {
    name: 'El alma contemporánea',
    tag: 'LIBERTAD EN CADA LÍNEA',
    description:
      'Te mueves entre lo clásico y lo inesperado. Eliges piezas versátiles y las haces completamente tuyas.',
    collection: 'Signature',
    image: '/images/signature.webp',
  },
];
