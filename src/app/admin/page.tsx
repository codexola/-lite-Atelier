import { AdminScreen } from '@/components/admin-screen';
import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administración', robots: { index: false } };
export default async function Admin() {
  const user = await currentUser();
  if (!user) redirect('/cuenta?next=/admin');
  if (user.role === 'customer') redirect('/cuenta');
  return <AdminScreen />;
}
