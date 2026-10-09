'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { requestsQueryOptions, assetCatalogQueryOptions } from '../api/queries';
import { formatDateVN } from "@/lib/date";
import {
  useCreateAssetRequest,
  useSubmitAssetRequest,
  useCancelAssetRequest,
} from '../api/mutations';
import type { AssetRequestListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import {
  REQUEST_STATUS_MAP,
  type AssetRequestRow,
  type AssetTypeRow,
} from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { AssetRequestDetailDialog } from './asset-request-detail-dialog';
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

const copy = assetManagementUiCopy.requests;

export function AssetRequestsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: AssetRequestListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status
      ? { status: params.status as any }
      : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    requestsQueryOptions(filters),
  );
  const rows = extractList<AssetRequestRow>(data);
  const pagination = extractPagination(data);

  const { data: catalogData } = useQuery(assetCatalogQueryOptions({ limit: 500 }));
  const assetTypes = React.useMemo(
    () => extractList<AssetTypeRow>(catalogData),
    [catalogData],
  );

  const createMutation = useCreateAssetRequest();
  const submitMutation = useSubmitAssetRequest();
  const cancelMutation = useCancelAssetRequest();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [lineAssetTypeId, setLineAssetTypeId] = React.useState('');
  const [lineQuantity, setLineQuantity] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [neededBy, setNeededBy] = React.useState('');
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<'submit' | 'cancel' | null>(null);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);

  const stats = React.useMemo(() => {
    return {
      total: rows.length,
      draft: rows.filter((r) => r.status === 'draft').length,
      pending: rows.filter((r) => r.status === 'pending_approval').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      fulfilled: rows.filter((r) => r.status === 'fulfilled').length,
    };
  }, [rows]);

  const openRow = rows.find((r) => r.id === confirmId);

  const handleConfirm = (id: string, action: 'submit' | 'cancel') => {
    if (action === 'submit') {
      handleSubmit(id);
    } else {
      handleCancel(id);
    }
    setConfirmId(null);
    setConfirmAction(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineAssetTypeId) return;
    createMutation.mutate(
      {
        ...(reason ? { reason } : {}),
        ...(neededBy ? { neededBy } : {}),
        lines: [
          {
            assetTypeId: lineAssetTypeId,
            quantity: Number(lineQuantity) || 1,
          },
        ],
      },
      {
        onSuccess: () => {
          notifyMutationSuccess(copy.toastSuccess);
          setCreateOpen(false);
          setLineAssetTypeId('');
          setLineQuantity('');
          setReason('');
          setNeededBy('');
        },
        onError: (err) => notifyMutationError(err, copy.toastSuccess),
      },
    );
  };

  const handleSubmit = (id: string) => {
    submitMutation.mutate(
      { id },
      {
        onSuccess: () => notifyMutationSuccess(copy.toastSuccessSubmit),
        onError: (err) => notifyMutationError(err, copy.toastSuccessSubmit),
      },
    );
    setConfirmId(null);
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(
      { id },
      {
        onSuccess: () => notifyMutationSuccess(copy.toastSuccessCancel),
        onError: (err) => notifyMutationError(err, copy.toastSuccessCancel),
      },
    );
    setConfirmId(null);
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

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      {/* Workflow Metrics Banner */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Card className='border-l-4 border-l-slate-400'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-muted-foreground'>Tổng yêu cầu</div>
            <div className='mt-1 text-2xl font-bold'>{stats.total}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-amber-700 dark:text-amber-400'>Chờ quản lý duyệt</div>
            <div className='mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200'>{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-indigo-700 dark:text-indigo-400'>Đã duyệt · Chờ cấp phát</div>
            <div className='mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-200'>{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-emerald-700 dark:text-emerald-400'>Đã bàn giao thiết bị</div>
            <div className='mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200'>{stats.fulfilled}</div>
          </CardContent>
        </Card>
      </div>

      <div className='flex items-center justify-between gap-2'>
        <div className='text-sm text-muted-foreground'>
          Nhấp vào bất kỳ hàng nào để kiểm tra tiến trình quy trình và xuất kho thiết bị.
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>
              <Icons.add className='mr-2 size-4' />
              {copy.create}
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[480px]'>
            <form onSubmit={handleCreate} className='space-y-4'>
              <DialogHeader>
                <DialogTitle>{copy.dialogTitle}</DialogTitle>
                <DialogDescription>{copy.dialogDescription}</DialogDescription>
              </DialogHeader>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='reqType'>{copy.fields.assetType}</Label>
                <Select value={lineAssetTypeId} onValueChange={setLineAssetTypeId}>
                  <SelectTrigger id='reqType'>
                    <SelectValue placeholder={copy.fields.assetType} />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name ?? t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='reqQty'>{copy.fields.quantity}</Label>
                <Input
                  id='reqQty'
                  type='number'
                  min={1}
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                  placeholder={copy.fields.quantity}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='reqReason'>{copy.fields.reason}</Label>
                <Input
                  id='reqReason'
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={copy.fields.reason}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='reqNeededBy'>{copy.fields.neededBy}</Label>
                <Input
                  id='reqNeededBy'
                  type='date'
                  value={neededBy}
                  onChange={(e) => setNeededBy(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  {commonUiCopy.cancel}
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  {copy.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.laptop className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.requester}</TableHead>
                <TableHead>{copy.columns.assetType}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>Bước tiếp theo & Người phụ trách</TableHead>
                <TableHead>{copy.columns.createdAt}</TableHead>
                <TableHead className='text-right'>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                let nextStepText = 'Đã hoàn tất quy trình';
                let nextStepClass = 'text-muted-foreground';

                if (row.status === 'draft') {
                  nextStepText = 'Nhân viên nộp xét duyệt';
                  nextStepClass = 'text-blue-600 dark:text-blue-400 font-medium';
                } else if (row.status === 'pending_approval') {
                  nextStepText = 'Quản lý thẩm định & duyệt';
                  nextStepClass = 'text-amber-600 dark:text-amber-400 font-medium';
                } else if (row.status === 'approved') {
                  nextStepText = 'IT xuất kho & cấp phát';
                  nextStepClass = 'text-indigo-600 dark:text-indigo-400 font-semibold';
                } else if (row.status === 'rejected') {
                  nextStepText = 'Bị từ chối';
                  nextStepClass = 'text-destructive';
                } else if (row.status === 'cancelled') {
                  nextStepText = 'Đã hủy bỏ';
                  nextStepClass = 'text-muted-foreground line-through';
                }

                return (
                  <TableRow
                    key={row.id ?? Math.random().toString()}
                    className='cursor-pointer hover:bg-muted/40 transition-colors'
                    onClick={() => row.id && setSelectedRequestId(row.id)}
                  >
                    <TableCell className='font-medium'>
                      <div>{row.requesterEmployeeId ?? '—'}</div>
                      <div className='text-[11px] text-muted-foreground font-mono'>
                        #{row.id?.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-1 text-xs'>
                        {(row.lines ?? []).map((l) => (
                          <span key={l.id} className='inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5'>
                            {(l.assetTypeId ? l.assetTypeId.slice(0, 8) : '—')}... × {l.quantity}
                          </span>
                        ))}
                      </div>
                      {row.reason ? (
                        <p className='mt-1 text-xs text-muted-foreground line-clamp-1'>{row.reason}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={row.status ?? ''}
                        mapping={REQUEST_STATUS_MAP}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${nextStepClass}`}>
                        {nextStepText}
                      </span>
                    </TableCell>
                    <TableCell className='text-xs text-muted-foreground'>
                      {row.createdAt ? formatDateVN(row.createdAt) : '—'}
                    </TableCell>
                    <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center justify-end gap-1.5'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 text-xs'
                          onClick={() => row.id && setSelectedRequestId(row.id)}
                        >
                          <Icons.eye className='mr-1.5 size-3.5' />
                          Tiến trình
                        </Button>
                        {row.status === 'draft' && (
                          <>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs'
                              onClick={() => {
                                setConfirmId(row.id);
                                setConfirmAction('submit');
                              }}
                              disabled={submitMutation.isPending}
                            >
                              {copy.actions.submit}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 text-xs text-muted-foreground hover:text-destructive'
                              onClick={() => {
                                setConfirmId(row.id);
                                setConfirmAction('cancel');
                              }}
                              disabled={cancelMutation.isPending}
                            >
                              {copy.actions.cancel}
                            </Button>
                          </>
                        )}
                        {row.status === 'approved' && (
                          <Button
                            variant='default'
                            size='sm'
                            className='h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white'
                            onClick={() => row.id && setSelectedRequestId(row.id)}
                          >
                            <Icons.product className='mr-1.5 size-3.5' />
                            Cấp phát
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <DataTablePagination
          page={params.page}
          pageCount={Math.ceil(pagination.total / (filters.limit || 20))}
          pageSize={filters.limit || 20}
          total={pagination.total}
          onPageChange={(page) => void setParams({ page })}
        />
      ) : null}

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmId}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmId(null);
            setConfirmAction(null);
          }
        }}
      >
        <DialogContent className='sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'submit' ? copy.actions.submitConfirm : copy.actions.cancelConfirm}
            </DialogTitle>
            <DialogDescription>
              {openRow?.id ? `#${openRow.id.slice(0, 8)} · ${openRow.lines?.[0]?.assetTypeId ?? ''}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setConfirmId(null);
                setConfirmAction(null);
              }}
            >
              {commonUiCopy.close}
            </Button>
            <Button
              variant={confirmAction === 'cancel' ? 'destructive' : 'default'}
              onClick={() => confirmId && confirmAction && handleConfirm(confirmId, confirmAction)}
              disabled={(confirmAction === 'submit' && submitMutation.isPending) || (confirmAction === 'cancel' && cancelMutation.isPending)}
            >
              {confirmAction === 'submit' ? copy.actions.submit : copy.actions.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Workflow Inspection & Fulfillment Dialog */}
      <AssetRequestDetailDialog
        requestId={selectedRequestId}
        open={!!selectedRequestId}
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
      />
    </div>
  );
}
