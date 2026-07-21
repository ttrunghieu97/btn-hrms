import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assetCatalogControllerCreate,
  assetCatalogControllerUpdate,
  assetCatalogControllerRetire,
  assetCatalogControllerRegister,
  assetCatalogControllerUpdateAssetUnit,
  assetCatalogControllerChangeStatus,
  assetInventoryControllerReceive,
  assetInventoryControllerAdjust,
  assetRequestControllerCreate,
  assetRequestControllerUpdate,
  assetRequestControllerSubmit,
  assetRequestControllerCancel,
  assetIssueControllerIssue,
  assetIssueControllerReturn,
} from '@/api/generated/endpoints';
import type {
  CreateAssetTypeDto,
  UpdateAssetTypeDto,
  RegisterAssetDto,
  UpdateAssetDto,
  ChangeAssetStatusDto,
  ReceiveStockDto,
  AdjustStockDto,
  CreateRequestDto,
  UpdateRequestDto,
  IssueAssetDto,
  ReturnAssetDto,
} from '@/api/generated/model';
import {
  catalogKeys,
  assetUnitKeys,
  inventoryKeys,
  requestKeys,
  issueKeys,
  holdingsKeys,
  historyKeys,
} from '../queries/asset-queries';

// --- Catalog ---

export function useCreateAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAssetTypeDto) => assetCatalogControllerCreate(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all() }),
  });
}

export function useUpdateAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetTypeDto }) =>
      assetCatalogControllerUpdate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all() }),
  });
}

export function useRetireAssetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => assetCatalogControllerRetire(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all() }),
  });
}

// --- Asset Units ---

export function useRegisterAssetUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RegisterAssetDto) => assetCatalogControllerRegister(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetUnitKeys.all() }),
  });
}

export function useUpdateAssetUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetDto }) =>
      assetCatalogControllerUpdateAssetUnit(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetUnitKeys.all() }),
  });
}

export function useChangeAssetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChangeAssetStatusDto }) =>
      assetCatalogControllerChangeStatus(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetUnitKeys.all() });
      qc.invalidateQueries({ queryKey: historyKeys.all() });
    },
  });
}

// --- Inventory ---

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReceiveStockDto) => assetInventoryControllerReceive(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdjustStockDto) => assetInventoryControllerAdjust(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}

// --- Requests ---

export function useCreateAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRequestDto) => assetRequestControllerCreate(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.all() }),
  });
}

export function useUpdateAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRequestDto }) =>
      assetRequestControllerUpdate(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.all() }),
  });
}

export function useSubmitAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => assetRequestControllerSubmit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.all() }),
  });
}

export function useCancelAssetRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => assetRequestControllerCancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: requestKeys.all() }),
  });
}

// --- Issues ---

export function useIssueAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: IssueAssetDto) => assetIssueControllerIssue(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all() });
      qc.invalidateQueries({ queryKey: holdingsKeys.all() });
      qc.invalidateQueries({ queryKey: assetUnitKeys.all() });
      qc.invalidateQueries({ queryKey: inventoryKeys.all() });
      qc.invalidateQueries({ queryKey: historyKeys.all() });
    },
  });
}

export function useReturnAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ReturnAssetDto) => assetIssueControllerReturn(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all() });
      qc.invalidateQueries({ queryKey: holdingsKeys.all() });
      qc.invalidateQueries({ queryKey: assetUnitKeys.all() });
      qc.invalidateQueries({ queryKey: inventoryKeys.all() });
      qc.invalidateQueries({ queryKey: historyKeys.all() });
    },
  });
}