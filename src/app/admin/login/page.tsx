import { StaffLogin } from '@/components/staff-login';
import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Acceso del equipo',
  robots: { index: false, follow: false },
};
export default async function Login() {
  const user = await currentUser(true);
  if (user && user.role !== 'customer') redirect('/admin');
  return <StaffLogin />;
}
