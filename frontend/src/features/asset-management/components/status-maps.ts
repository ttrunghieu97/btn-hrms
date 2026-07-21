import type { StatusMap } from '@/components/ui/status-badge';
import { assetManagementUiCopy } from '@/locales/vi/app-copy';

export const ASSET_STATUS_MAP: StatusMap = {
  available: { label: assetManagementUiCopy.assetStatus.available, variant: 'default' },
  assigned: { label: assetManagementUiCopy.assetStatus.assigned, variant: 'secondary' },
  maintenance: { label: assetManagementUiCopy.assetStatus.maintenance, variant: 'outline' },
  retired: { label: assetManagementUiCopy.assetStatus.retired, variant: 'outline' },
  lost: { label: assetManagementUiCopy.assetStatus.lost, variant: 'destructive' },
};

export const REQUEST_STATUS_MAP: StatusMap = {
  draft: { label: assetManagementUiCopy.requestStatus.draft, variant: 'outline' },
  pending_approval: {
    label: assetManagementUiCopy.requestStatus.pending_approval,
    variant: 'secondary',
  },
  approved: { label: assetManagementUiCopy.requestStatus.approved, variant: 'default' },
  rejected: { label: assetManagementUiCopy.requestStatus.rejected, variant: 'destructive' },
  cancelled: { label: assetManagementUiCopy.requestStatus.cancelled, variant: 'outline' },
  fulfilled: { label: assetManagementUiCopy.requestStatus.fulfilled, variant: 'default' },
};

export const ISSUE_LINE_STATUS_MAP: StatusMap = {
  open: { label: assetManagementUiCopy.issueLineStatus.open, variant: 'secondary' },
  returned: { label: assetManagementUiCopy.issueLineStatus.returned, variant: 'outline' },
};

export interface AssetTypeRow {
  id: string;
  name?: string;
  category?: string | null;
  skuPattern?: string | null;
  description?: string | null;
  isTrackable?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface AssetUnitRow {
  id: string;
  assetTypeId?: string;
  serialNumber?: string;
  status?: string;
  createdAt?: string;
}

export interface InventoryRow {
  assetTypeId: string;
  quantityAvailable: number;
  quantityAssigned: number;
  quantityMaintenance: number;
  quantityLost: number;
}

export interface AssetRequestRow {
  id: string;
  requesterEmployeeId?: string;
  status?: string;
  reason?: string | null;
  neededByDate?: string | null;
  createdAt?: string;
}

export interface AssetIssueRow {
  id: string;
  employeeId?: string;
  issuedAt?: string;
  createdAt?: string;
}

export interface AssetIssueLineRow {
  id: string;
  issueId?: string;
  assetUnitId?: string;
  status?: string;
  returnedAt?: string | null;
}