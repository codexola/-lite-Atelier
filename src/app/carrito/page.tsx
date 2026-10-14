import { publicSettings } from '@/lib/settings';
import { CartScreen } from '@/components/checkout-screen';
export const metadata = { title: 'Tu selección', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default function Cart() {
  return <CartScreen settings={publicSettings()} />;
}
