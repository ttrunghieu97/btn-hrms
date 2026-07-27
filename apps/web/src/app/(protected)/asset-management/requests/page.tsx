import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetRequestsView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetRequests),
};

export default async function AssetRequestsPage() {
  await requireServerSession();
  return <AssetRequestsView />;
}
