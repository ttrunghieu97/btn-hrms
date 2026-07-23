import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { CoursesView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningCourses) };

export default async function CoursesPage() {
  await requirePageAccess('learning:view');
  return <CoursesView />;
}
