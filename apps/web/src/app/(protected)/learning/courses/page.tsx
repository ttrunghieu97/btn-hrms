import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { CoursesView } from '@/features/learning';

export const metadata = { title: buildDashboardMetadataTitle(routeLabels.learningCourses) };

export default async function CoursesPage() {
  await requireServerSession();
  return <CoursesView />;
}
