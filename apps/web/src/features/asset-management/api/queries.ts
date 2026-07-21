import { queryOptions } from '@tanstack/react-query';
import {
  assetCatalogControllerList,
  assetCatalogControllerListAssetUnits,
  assetInventoryControllerList,
  assetInventoryControllerGet,
  assetRequestControllerList,
  assetRequestControllerGet,
  assetIssueControllerList,
  assetIssueControllerGet,
  assetIssueControllerHoldings,
  assetHistoryControllerHistory,
} from '@/api/generated/endpoints';
import { queryPolicyPresets } from '@/lib/query-client';
import {
  catalogKeys,
  assetUnitKeys,
  inventoryKeys,
  requestKeys,
  issueKeys,
  holdingsKeys,
  historyKeys,
  type AssetCatalogListFilters,
  type AssetUnitListFilters,
  type AssetRequestListFilters,
  type AssetIssueListFilters,
} from '../queries/asset-queries';

export const assetCatalogQueryOptions = (filters?: AssetCatalogListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: catalogKeys.list(filters),
    queryFn: () => assetCatalogControllerList(filters),
  });

export const assetUnitsQueryOptions = (filters?: AssetUnitListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: assetUnitKeys.list(filters),
    queryFn: () => assetCatalogControllerListAssetUnits(filters),
  });

export const inventoryQueryOptions = () =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: inventoryKeys.list({}),
    queryFn: () => assetInventoryControllerList(),
  });

export const inventoryDetailQueryOptions = (assetTypeId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: inventoryKeys.detail(assetTypeId),
    queryFn: () => assetInventoryControllerGet(assetTypeId),
    enabled: !!assetTypeId,
  });

export const requestsQueryOptions = (filters?: AssetRequestListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: requestKeys.list(filters),
    queryFn: () => assetRequestControllerList(filters),
  });

export const requestDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: requestKeys.detail(id),
    queryFn: () => assetRequestControllerGet(id),
    enabled: !!id,
  });

export const issuesQueryOptions = (filters?: AssetIssueListFilters) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: issueKeys.list(filters),
    queryFn: () => assetIssueControllerList(filters),
  });

export const issueDetailQueryOptions = (id: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: issueKeys.detail(id),
    queryFn: () => assetIssueControllerGet(id),
    enabled: !!id,
  });

export const employeeHoldingsQueryOptions = (employeeId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: holdingsKeys.byEmployee(employeeId),
    queryFn: () => assetIssueControllerHoldings(employeeId),
    enabled: !!employeeId,
  });

export const assetHistoryQueryOptions = (assetId: string) =>
  queryOptions({
    ...queryPolicyPresets['employees'],
    queryKey: historyKeys.byAsset(assetId),
    queryFn: () => assetHistoryControllerHistory(assetId),
    enabled: !!assetId,
  });