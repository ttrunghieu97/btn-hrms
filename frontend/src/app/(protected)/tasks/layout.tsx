import { TasksSheetsController } from '@/features/tasks';
import { buildDashboardMetadataTitle, pageCopy } from '@/lib/app-copy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: buildDashboardMetadataTitle(pageCopy.dashboard.tasks.title),
  description: pageCopy.dashboard.tasks.description
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>{children}</div>
      <TasksSheetsController />
    </>
  );
}
