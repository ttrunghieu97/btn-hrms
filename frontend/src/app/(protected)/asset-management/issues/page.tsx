import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetIssuesView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetIssues),
};

export default async function AssetIssuesPage() {
  await requirePageAccess('asset:view');
  return <AssetIssuesView />;
}
