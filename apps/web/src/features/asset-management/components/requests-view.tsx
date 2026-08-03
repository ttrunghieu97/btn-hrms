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
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>{copy.create}</Button>
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
          icon={<Icons.page className='size-10' />}
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
                <TableHead>{copy.columns.createdAt}</TableHead>
                <TableHead></TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id ?? Math.random().toString()}>

                  <TableCell className='font-medium'>{row.requesterEmployeeId ?? '—'}</TableCell>
                  <TableCell>
                    <div className='flex flex-wrap gap-1 text-xs'>
                      {(row.lines ?? []).map((l) => (
                        <span key={l.id}>
                          {l.assetTypeId} × {l.quantity}
                        </span>
                      ))}
                    </div>
                    {row.reason ? (
                      <p className='mt-1 text-xs text-muted-foreground'>{row.reason}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={row.status ?? ''}
                      mapping={REQUEST_STATUS_MAP}
                    />
                  </TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  {row.status === 'draft' && (
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
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
                          onClick={() => {
                            setConfirmId(row.id);
                            setConfirmAction('cancel');
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          {copy.actions.cancel}
                        </Button>
                      </div>
                    </TableCell>
                  )}

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page <= 1}
            onClick={() => void setParams({ page: params.page - 1 })}
          >
            ‹
          </Button>
          <span className='text-sm text-muted-foreground'>{params.page}</span>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page * filters.limit! >= pagination.total}
            onClick={() => void setParams({ page: params.page + 1 })}
          >
            ›
          </Button>
        </div>
      ) : null}

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
    </div>
  );
}
