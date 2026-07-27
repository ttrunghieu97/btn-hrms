import type { SearchParams } from 'nuqs/server';
import { TaskListingPage } from '@/features/tasks';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import { requireServerSession } from '@/lib/server/auth-session';
import { permissions } from '@/lib/permissions';
import { searchParamsCache } from '@/lib/searchparams';

export const metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.tasks.title),
  description: pageCopy.dashboard.tasks.description
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function TasksPage(props: PageProps) {
  await requireServerSession();

  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return <TaskListingPage />;
}
