import { getProducts } from '@/lib/db';
import { CameraFitting } from '@/components/camera-fitting';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Probador virtual · Élite Lab',
  description:
    'Explora nuestras prendas en tu cámara con seguimiento corporal local y una vista previa experimental.',
};
export default async function Fitting() {
  return <CameraFitting products={await getProducts()} />;
}
