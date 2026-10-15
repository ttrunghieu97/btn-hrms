'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { assetCatalogQueryOptions } from '../api/queries';
import { formatDateVN } from '@/lib/date';
import {
  useCreateAssetType,
  useUpdateAssetType,
  useRetireAssetType,
} from '../api/mutations';
import type { AssetCatalogListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import type { AssetTypeRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

  const createAssetType = useCreateAssetType();
  const updateAssetType = useUpdateAssetType();
  const retireAssetType = useRetireAssetType();

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
      <div className='flex items-center justify-end'>
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
    </div>
  );
}
