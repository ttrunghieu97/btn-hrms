import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetCatalogView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetCatalog),
};

export default async function AssetCatalogPage() {
  await requireServerSession();
  return <AssetCatalogView />;
}
