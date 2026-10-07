import { requireServerSession } from '@/lib/server/auth-session';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';
import { InventoryView } from '@/features/asset-management';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetInventory),
};

export default async function AssetInventoryPage() {
  await requireServerSession();
  return <InventoryView />;
}
