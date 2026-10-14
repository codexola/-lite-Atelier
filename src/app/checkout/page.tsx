import { publicSettings } from '@/lib/settings';
import { CheckoutScreen } from '@/components/checkout-screen';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout', robots: { index: false } };
export default function Checkout() {
  return <CheckoutScreen settings={publicSettings()} />;
}
