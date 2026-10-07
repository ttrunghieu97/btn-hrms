import { createKeyFactory } from '@/lib/query-keys';

export type AssetCatalogListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  isTrackable?: boolean;
};

export type AssetUnitListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  assetTypeId?: string;
  status?: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost';
};

export type AssetInventoryListFilters = {};

export type AssetRequestListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  requesterEmployeeId?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'fulfilled';
};

export type AssetIssueListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  requestId?: string;
  lineStatus?: 'open' | 'returned';
};

export const catalogKeys = createKeyFactory<AssetCatalogListFilters>('asset-catalog');
export const assetUnitKeys = createKeyFactory<AssetUnitListFilters>('asset-units');
export const inventoryKeys = createKeyFactory<AssetInventoryListFilters>('asset-inventory');
export const requestKeys = createKeyFactory<AssetRequestListFilters>('asset-requests');
export const issueKeys = createKeyFactory<AssetIssueListFilters>('asset-issues');

export const holdingsKeys = {
  all: () => ['asset-holdings'] as const,
  byEmployee: (employeeId: string) =>
    ['asset-holdings', 'employee', employeeId] as const,
};

export const historyKeys = {
  all: () => ['asset-history'] as const,
  byAsset: (assetId: string) =>
    ['asset-history', 'asset', assetId] as const,
};
