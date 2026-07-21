import { requireServerSession } from '@/lib/server/auth-session';
import { redirect } from 'next/navigation';
import { navGroups } from '@/config/nav-config';
import { filterNavItems } from '@/hooks/use-nav';

export default async function Page() {
  const user = await requireServerSession('/auth/sign-in');

  const allowedItems = filterNavItems(
    navGroups.flatMap((g) => g.items),
    user
  );

  if (allowedItems.length > 0 && allowedItems[0].url) {
    redirect(allowedItems[0].url);
  }

  redirect('/account/profile');
}
