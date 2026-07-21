import type { SearchParams } from 'nuqs/server';
import { UserListingPage } from '@/features/users';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requirePageAccess } from '@/lib/page-access';
import { permissions } from '@/lib/permissions';
import { searchParamsCache } from '@/lib/searchparams';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.users.title),
  description: pageCopy.dashboard.users.description
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AdminUsersPage(props: PageProps) {
  await requirePageAccess(permissions.users.view);

  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return <UserListingPage />;
}
