import { IdentityScreen } from '@/components/identity-screen';
import { getProducts } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Descubre tu identidad' };
export default async function Identity() {
  return <IdentityScreen products={await getProducts()} />;
}
