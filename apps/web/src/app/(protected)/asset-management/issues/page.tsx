import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetIssuesView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetIssues),
};

export default async function AssetIssuesPage() {
  await requireServerSession();
  return <AssetIssuesView />;
}
