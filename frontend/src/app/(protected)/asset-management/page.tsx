import { redirect } from 'next/navigation';
import { buildDashboardMetadataTitle, routeLabels } from '@/locales/vi/app-copy';

export const metadata = {
  title: buildDashboardMetadataTitle(routeLabels.assetManagement),
};

export default function AssetManagementPage() {
  redirect('/asset-management/catalog');
}