import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { AssetCatalogView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetCatalog),
};

export default async function AssetCatalogPage() {
  await requirePageAccess('asset:view');
  return <AssetCatalogView />;
}
