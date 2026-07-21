import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetRequestsView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetRequests),
};

export default async function AssetRequestsPage() {
  await requirePageAccess('asset:view');
  return <AssetRequestsView />;
}
