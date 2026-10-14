import { AdminScreen } from '@/components/admin-screen';
import { currentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Business Studio',
  robots: { index: false, follow: false },
};
const sections = [
  'products',
  'taxonomy',
  'orders',
  'shipping',
  'promotions',
  'customers',
  'returns',
  'media',
  'creation',
  'moderation',
  'content',
  'marketing',
  'leads',
  'contacts',
  'reports',
  'users',
  'security',
  'audit',
];
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  const user = await currentUser(true);
  if (!user || user.role === 'customer') redirect('/admin/login');
  const permitted =
    user.role === 'admin' ||
    section === 'security' ||
    (user.role === 'editor' &&
      [
        'products',
        'taxonomy',
        'media',
        'creation',
        'moderation',
        'content',
      ].includes(section)) ||
    (user.role === 'operator' &&
      [
        'orders',
        'shipping',
        'promotions',
        'customers',
        'returns',
        'marketing',
        'leads',
        'contacts',
        'reports',
      ].includes(section));
  if (!permitted) redirect('/admin');
  return <AdminScreen initialTab={section} />;
}
