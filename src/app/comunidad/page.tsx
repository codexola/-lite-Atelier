import { CommunityScreen } from '@/components/community-screen';
import { db, databaseConfigured } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'La comunidad' };
export default async function Community() {
  let initialPosts: any[] = [];
  if (databaseConfigured()) {
    const c = await db();
    initialPosts = (
      await c.execute(
        "SELECT p.*,COALESCE(u.name,'Élite Atelier · Editorial') author FROM posts p LEFT JOIN users u ON u.id=p.user_id WHERE p.status='published' ORDER BY p.created_at DESC",
      )
    ).rows;
  } else {
    initialPosts = [
      {
        id: 'editorial-1',
        title: 'La belleza de elegirte',
        body: 'La sastrería se libera de las reglas. Una historia editorial de Élite Atelier.',
        image: '/images/community-1.webp',
        author: 'Élite Atelier · Editorial',
        category: 'Historias',
      },
      {
        id: 'editorial-2',
        title: 'El arte de los pequeños detalles',
        body: 'Una textura, una costura, un gesto. La intención se encuentra en lo que permanece.',
        image: '/images/community-2.webp',
        author: 'Élite Atelier · Editorial',
        category: 'Inspiración',
      },
    ];
  }
  return <CommunityScreen initialPosts={initialPosts} />;
}
