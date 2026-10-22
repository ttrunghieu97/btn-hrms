'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import {
  assetCatalogQueryOptions,
  assetUnitsQueryOptions,
  assetHistoryQueryOptions,
} from '../api/queries';
import { formatDateVN } from '@/lib/date';
import {
  useCreateAssetType,
  useUpdateAssetType,
  useRetireAssetType,
  useRegisterAssetUnit,
  useUpdateAssetUnit,
  useChangeAssetStatus,
} from '../api/mutations';
import type { ChangeAssetStatusDtoStatus } from '@/api/generated/model';
import type { AssetCatalogListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import {
  ASSET_STATUS_MAP,
  HISTORY_KIND_MAP,
  type AssetTypeRow,
  type AssetUnitRow,
  type AssetHistoryEntryRow,
} from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, assetManagementUiCopy } from '@/locales/vi/app-copy';
import { pageParser } from '@/lib/pagination';

const copy = assetManagementUiCopy.catalog;

export function AssetCatalogView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    search: parseAsString,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AssetTypeRow | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  // Asset Unit Registration / Update / Status / History state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AssetUnitRow | null>(null);
  const [unitForm, setUnitForm] = useState({
    assetTypeId: '',
    code: '',
    name: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
  });
  const [statusUnit, setStatusUnit] = useState<AssetUnitRow | null>(null);
  const [nextStatus, setNextStatus] = useState<ChangeAssetStatusDtoStatus>('available');
  const [statusNote, setStatusNote] = useState('');
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);

  const createAssetType = useCreateAssetType();
  const updateAssetType = useUpdateAssetType();
  const retireAssetType = useRetireAssetType();
  const registerAssetUnit = useRegisterAssetUnit();
  const updateAssetUnit = useUpdateAssetUnit();
  const changeAssetStatus = useChangeAssetStatus();

  const filters: AssetCatalogListFilters = {
    page: params.page,
    limit: 20,
    ...(params.search ? { search: params.search } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    assetCatalogQueryOptions(filters),
  );
  const rows = extractList<AssetTypeRow>(data);
  const pagination = extractPagination(data);

  const { data: unitsData } = useQuery(assetUnitsQueryOptions({ limit: 100 }));
  const unitRows = extractList<AssetUnitRow>(unitsData);

  const { data: historyData, isLoading: isHistoryLoading } = useQuery(
    assetHistoryQueryOptions(historyAssetId ?? ''),
  );
  const historyRows = extractList<AssetHistoryEntryRow>(historyData);

  const typeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.id, r.name ?? r.id);
    }
    return map;
  }, [rows]);

  const openCreateDialog = () => {
    setEditingRow(null);
    setName('');
    setCode('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEditDialog = (row: AssetTypeRow) => {
    setEditingRow(row);
    setName(row.name ?? '');
    setCode(row.skuPattern ?? '');
    setDescription(row.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingRow) {
        await updateAssetType.mutateAsync({
          id: editingRow.id,
          dto: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        });
        notifyMutationSuccess('Đã cập nhật danh mục tài sản');
      } else {
        if (!code.trim()) return;
        await createAssetType.mutateAsync({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          isTrackable: true,
        });
        notifyMutationSuccess('Đã thêm danh mục tài sản mới');
      }
      setDialogOpen(false);
      setEditingRow(null);
    } catch (err) {
      notifyMutationError(err, 'Không thể lưu danh mục tài sản');
    }
  };

  const handleRetire = async (id: string) => {
    try {
      await retireAssetType.mutateAsync({ id });
      notifyMutationSuccess('Đã ngừng sử dụng danh mục tài sản');
    } catch (err) {
      notifyMutationError(err, 'Không thể ngừng sử dụng danh mục tài sản');
    }
  };

  const openRegisterUnitDialog = () => {
    setEditingUnit(null);
    setUnitForm({
      assetTypeId: rows[0]?.id ?? '',
      code: '',
      name: '',
      serialNumber: '',
      purchaseDate: '',
      purchaseCost: '',
    });
    setUnitDialogOpen(true);
  };

  const openEditUnitDialog = (unit: AssetUnitRow) => {
    setEditingUnit(unit);
    setUnitForm({
      assetTypeId: unit.assetTypeId ?? '',
      code: unit.code ?? '',
      name: unit.name ?? '',
      serialNumber: unit.serialNumber ?? '',
      purchaseDate: unit.purchaseDate ? unit.purchaseDate.slice(0, 10) : '',
      purchaseCost: unit.purchaseCost ?? '',
    });
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    try {
      if (editingUnit) {
        await updateAssetUnit.mutateAsync({
          id: editingUnit.id,
          dto: {
            ...(unitForm.name.trim() ? { name: unitForm.name.trim() } : {}),
            ...(unitForm.serialNumber.trim()
              ? { serialNumber: unitForm.serialNumber.trim() }
              : {}),
            ...(unitForm.purchaseDate ? { purchaseDate: unitForm.purchaseDate } : {}),
            ...(unitForm.purchaseCost ? { purchaseCost: unitForm.purchaseCost } : {}),
          },
        });
        notifyMutationSuccess('Đã cập nhật đơn vị thiết bị');
      } else {
        if (!unitForm.assetTypeId || !unitForm.code.trim() || !unitForm.name.trim()) {
          return;
        }
        await registerAssetUnit.mutateAsync({
          assetTypeId: unitForm.assetTypeId,
          code: unitForm.code.trim().toUpperCase(),
          name: unitForm.name.trim(),
          ...(unitForm.serialNumber.trim()
            ? { serialNumber: unitForm.serialNumber.trim() }
            : {}),
          ...(unitForm.purchaseDate ? { purchaseDate: unitForm.purchaseDate } : {}),
          ...(unitForm.purchaseCost ? { purchaseCost: unitForm.purchaseCost } : {}),
        });
        notifyMutationSuccess('Đã đăng ký đơn vị thiết bị vật lý');
      }
      setUnitDialogOpen(false);
      setEditingUnit(null);
    } catch (err) {
      notifyMutationError(err, 'Không thể lưu đơn vị thiết bị');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusUnit) return;
    try {
      await changeAssetStatus.mutateAsync({
        id: statusUnit.id,
        dto: {
          status: nextStatus,
          ...(statusNote.trim() ? { note: statusNote.trim() } : {}),
        },
      });
      notifyMutationSuccess('Đã cập nhật trạng thái thiết bị');
      setStatusUnit(null);
      setStatusNote('');
    } catch (err) {
      notifyMutationError(err, 'Không thể đổi trạng thái thiết bị');
    }
  };

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={copy.title}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  const isSaving = createAssetType.isPending || updateAssetType.isPending;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' size='sm' onClick={openRegisterUnitDialog}>
          <Icons.add className='mr-1.5 h-4 w-4' />
          Đăng ký thiết bị (Serial)
        </Button>
        <Button size='sm' onClick={openCreateDialog}>
          <Icons.add className='mr-1.5 h-4 w-4' />
          Thêm loại tài sản
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingRow ? 'Chỉnh sửa loại tài sản' : 'Thêm loại tài sản mới'}
            </DialogTitle>
            <DialogDescription>
              Quản lý danh mục tài sản và mã định danh SKU trong kho thiết bị.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='asset-type-name'>{copy.columns.name} *</Label>
              <Input
                id='asset-type-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='VD: Laptop MacBook Pro 14"'
              />
            </div>

            {!editingRow && (
              <div className='space-y-1.5'>
                <Label htmlFor='asset-type-code'>{copy.columns.sku} *</Label>
                <Input
                  id='asset-type-code'
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder='VD: MBP-14'
                />
              </div>
            )}

            <div className='space-y-1.5'>
              <Label htmlFor='asset-type-desc'>{commonUiCopy.description}</Label>
              <Textarea
                id='asset-type-desc'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Mô tả cấu hình / quy cách...'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button onClick={() => void handleSave()} isLoading={isSaving}>
              {editingRow ? commonUiCopy.saveChanges : commonUiCopy.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.name}</TableHead>
                <TableHead>{copy.columns.category}</TableHead>
                <TableHead>{copy.columns.sku}</TableHead>
                <TableHead>{copy.columns.createdAt}</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell>{row.category ?? '—'}</TableCell>
                  <TableCell>{row.skuPattern ?? '—'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openEditDialog(row)}
                      >
                        Chỉnh sửa
                      </Button>
                      {row.isActive !== false && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => void handleRetire(row.id)}
                          disabled={retireAssetType.isPending}
                        >
                          Ngừng sử dụng
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > (filters.limit ?? 20) ? (
        <DataTablePagination
          page={params.page}
          pageCount={Math.ceil(pagination.total / (filters.limit || 20))}
          pageSize={filters.limit || 20}
          total={pagination.total}
          onPageChange={(page) => void setParams({ page })}
        />
      ) : null}

      {/* Registered Physical Asset Units Section */}
      {unitRows.length > 0 && (
        <div className='mt-2 space-y-2'>
          <h3 className='text-sm font-semibold text-foreground'>
            Đơn vị thiết bị vật lý (Serial / Asset Tag)
          </h3>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã tài sản</TableHead>
                  <TableHead>{copy.columns.name}</TableHead>
                  <TableHead>Loại tài sản</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>{assetManagementUiCopy.requests.columns.status}</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitRows.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className='font-mono text-xs font-medium'>
                      {unit.code ?? unit.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className='font-medium'>{unit.name ?? '—'}</TableCell>
                    <TableCell>
                      {(unit.assetTypeId ? typeMap.get(unit.assetTypeId) : undefined) ?? '—'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {unit.serialNumber ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={unit.status ?? 'available'}
                        mapping={ASSET_STATUS_MAP}
                      />
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1.5'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openEditUnitDialog(unit)}
                        >
                          Cập nhật
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setStatusUnit(unit);
                            setNextStatus(
                              (unit.status as ChangeAssetStatusDtoStatus) ?? 'available',
                            );
                            setStatusNote('');
                          }}
                        >
                          Đổi trạng thái
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setHistoryAssetId(unit.id)}
                        >
                          Lịch sử
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Register / Update Asset Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Cập nhật đơn vị thiết bị' : 'Đăng ký thiết bị vật lý (Serial)'}
            </DialogTitle>
            <DialogDescription>
              Ghi nhận từng thiết bị có mã tài sản (Asset Tag) và số Serial riêng biệt.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            {!editingUnit && (
              <>
                <div className='space-y-1.5'>
                  <Label>Loại tài sản *</Label>
                  <Select
                    value={unitForm.assetTypeId}
                    onValueChange={(val) =>
                      setUnitForm((prev) => ({ ...prev, assetTypeId: val }))
                    }
                  >
                    <SelectTrigger aria-label='Loại tài sản'>
                      <SelectValue placeholder='Chọn loại tài sản...' />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name ?? r.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='unit-code'>Mã tài sản (Asset Tag) *</Label>
                  <Input
                    id='unit-code'
                    value={unitForm.code}
                    onChange={(e) =>
                      setUnitForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder='VD: AST-MBP-001'
                  />
                </div>
              </>
            )}
            <div className='space-y-1.5'>
              <Label htmlFor='unit-name'>Tên thiết bị *</Label>
              <Input
                id='unit-name'
                value={unitForm.name}
                onChange={(e) =>
                  setUnitForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder='VD: MacBook Pro M3 #001'
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='unit-serial'>Số Serial (S/N)</Label>
              <Input
                id='unit-serial'
                value={unitForm.serialNumber}
                onChange={(e) =>
                  setUnitForm((prev) => ({ ...prev, serialNumber: e.target.value }))
                }
                placeholder='VD: C02XYZ123456'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='unit-purchase-date'>Ngày mua</Label>
                <Input
                  id='unit-purchase-date'
                  type='date'
                  value={unitForm.purchaseDate}
                  onChange={(e) =>
                    setUnitForm((prev) => ({ ...prev, purchaseDate: e.target.value }))
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='unit-purchase-cost'>Giá trị mua</Label>
                <Input
                  id='unit-purchase-cost'
                  value={unitForm.purchaseCost}
                  onChange={(e) =>
                    setUnitForm((prev) => ({ ...prev, purchaseCost: e.target.value }))
                  }
                  placeholder='35000000'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setUnitDialogOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleSaveUnit()}
              disabled={registerAssetUnit.isPending || updateAssetUnit.isPending}
            >
              {editingUnit ? commonUiCopy.saveChanges : commonUiCopy.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Asset Unit Status Dialog */}
      <Dialog
        open={Boolean(statusUnit)}
        onOpenChange={(open) => {
          if (!open) setStatusUnit(null);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Đổi trạng thái thiết bị</DialogTitle>
            <DialogDescription>
              {statusUnit?.name ?? statusUnit?.code ?? ''}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label>Trạng thái mới</Label>
              <Select
                value={nextStatus}
                onValueChange={(val) =>
                  setNextStatus(val as ChangeAssetStatusDtoStatus)
                }
              >
                <SelectTrigger aria-label='Trạng thái mới'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='available'>
                    {assetManagementUiCopy.assetStatus.available}
                  </SelectItem>
                  <SelectItem value='maintenance'>
                    {assetManagementUiCopy.assetStatus.maintenance}
                  </SelectItem>
                  <SelectItem value='retired'>
                    {assetManagementUiCopy.assetStatus.retired}
                  </SelectItem>
                  <SelectItem value='lost'>
                    {assetManagementUiCopy.assetStatus.lost}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='status-note'>Ghi chú</Label>
              <Textarea
                id='status-note'
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder='Ghi chú lý do bảo trì / thanh lý...'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setStatusUnit(null)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleConfirmStatusChange()}
              disabled={changeAssetStatus.isPending}
            >
              {commonUiCopy.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Unit History Dialog */}
      <Dialog
        open={Boolean(historyAssetId)}
        onOpenChange={(open) => {
          if (!open) setHistoryAssetId(null);
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Lịch sử biến động tài sản</DialogTitle>
            <DialogDescription>
              Nhật ký đăng ký, bàn giao, thu hồi và bảo trì của thiết bị.
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-80 space-y-2 overflow-y-auto py-2'>
            {isHistoryLoading ? (
              <div className='flex items-center justify-center py-6'>
                <Icons.spinner className='size-5 animate-spin text-muted-foreground' />
              </div>
            ) : historyRows.length === 0 ? (
              <p className='py-4 text-center text-sm text-muted-foreground'>
                Chưa có lịch sử biến động.
              </p>
            ) : (
              historyRows.map((entry) => (
                <div
                  key={entry.id}
                  className='flex items-center justify-between rounded-md border p-2.5 text-xs'
                >
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-2'>
                      <StatusBadge
                        status={entry.kind ?? 'created'}
                        mapping={HISTORY_KIND_MAP}
                      />
                      {entry.detail && (
                        <span className='font-medium text-foreground'>
                          {entry.detail}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className='text-muted-foreground'>
                    {entry.occurredAt || entry.createdAt
                      ? formatDateVN((entry.occurredAt ?? entry.createdAt)!)
                      : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
