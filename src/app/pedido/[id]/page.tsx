import { OrderScreen } from '@/components/checkout-screen';
export const metadata = { title: 'Tu pedido', robots: { index: false } };
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderScreen id={(await params).id} />;
}
