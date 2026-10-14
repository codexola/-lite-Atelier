import { getProducts } from '@/lib/db';
import { CatalogScreen } from '@/components/catalog-screen';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Colecciones' };
export default async function Collections() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">EL UNIVERSO ÉLITE</span>
        <h1>
          Piezas con carácter.
          <br />
          <em>Historias que se visten.</em>
        </h1>
        <p>
          Elige lo que habla de ti. Explora nuestras colecciones conceptuales de
          sastrería, esenciales y expresiones singulares.
        </p>
      </div>
      <CatalogScreen products={await getProducts()} />
    </>
  );
}
