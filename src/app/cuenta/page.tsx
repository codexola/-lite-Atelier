import { AccountScreen } from '@/components/account-screen';
import { getProducts } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Mi atelier · Cuenta',
  robots: { index: false },
};
export default async function Account() {
  return <AccountScreen products={await getProducts()} />;
}
