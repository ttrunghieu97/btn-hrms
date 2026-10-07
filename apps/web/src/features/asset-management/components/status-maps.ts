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

export const HISTORY_KIND_MAP: StatusMap = {
  created: { label: assetManagementUiCopy.issues.historyKind.created, variant: 'default' },
  received: { label: assetManagementUiCopy.issues.historyKind.received, variant: 'default' },
  reserved: { label: assetManagementUiCopy.issues.historyKind.reserved, variant: 'secondary' },
  issued: { label: assetManagementUiCopy.issues.historyKind.issued, variant: 'secondary' },
  returned: { label: assetManagementUiCopy.issues.historyKind.returned, variant: 'outline' },
  transferred: { label: assetManagementUiCopy.issues.historyKind.transferred, variant: 'secondary' },
  maintenance: { label: assetManagementUiCopy.issues.historyKind.maintenance, variant: 'outline' },
  disposed: { label: assetManagementUiCopy.issues.historyKind.disposed, variant: 'destructive' },
  adjusted: { label: assetManagementUiCopy.issues.historyKind.adjusted, variant: 'outline' },
};

export interface AssetHistoryEntryRow {
  id: string;
  kind?: string;
  assetId?: string;
  assetTypeId?: string;
  issueId?: string | null;
  issueLineId?: string | null;
  employeeId?: string | null;
  quantityDelta?: number | null;
  detail?: string | null;
  occurredAt?: string;
  actorUserId?: string | null;
  createdAt?: string;
}

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
  lines?: AssetRequestLineRow[];
}

export interface AssetRequestLineRow {
  id: string;
  requestId?: string;
  assetTypeId?: string;
  quantity?: number;
  note?: string | null;
}

export interface AssetIssueRow {
  id: string;
  employeeId?: string;
  issuedAt?: string;
  createdAt?: string;
  lines?: AssetIssueLineRow[];
}

export interface AssetIssueLineRow {
  id: string;
  issueId?: string;
  assetUnitId?: string;
  assetId?: string | null;
  assetTypeId?: string;
  quantity?: number;
  status?: string;
  returnedAt?: string | null;
}