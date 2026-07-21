import { requirePageAccess } from '@/lib/page-access';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { InventoryView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetInventory),
};

export default async function AssetInventoryPage() {
  await requirePageAccess('asset:view');
  return <InventoryView />;
}
