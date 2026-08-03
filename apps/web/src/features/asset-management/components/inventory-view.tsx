'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { inventoryQueryOptions } from '../api/queries';
import { useReceiveStock, useAdjustStock } from '../api/mutations';
import type { AssetInventoryListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { type InventoryRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const copy = assetManagementUiCopy.inventory;

export function InventoryView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: AssetInventoryListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status as any } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    inventoryQueryOptions(),
  );
  const rows = extractList<InventoryRow>(data);
  const pagination = extractPagination(data);

  const receiveMutation = useReceiveStock();
  const adjustMutation = useAdjustStock();

  const [action, setAction] = React.useState<{
    mode: 'receive' | 'adjust';
    assetTypeId: string;
  } | null>(null);
  const [quantity, setQuantity] = React.useState('');
  const [note, setNote] = React.useState('');

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    receiveMutation.mutate(
      {
        assetTypeId: action.assetTypeId,
        quantity: Number(quantity) || 1,
        ...(note ? { note } : {}),
      },
      {
        onSuccess: () => {
          notifyMutationSuccess(copy.toastSuccess);
          setAction(null);
          setQuantity('');
          setNote('');
        },
        onError: (err) => notifyMutationError(err, copy.toastSuccess),
      },
    );
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    adjustMutation.mutate(
      {
        assetTypeId: action.assetTypeId,
        delta: Number(quantity) || 0,
        ...(note ? { reason: note } : {}),
      },
      {
        onSuccess: () => {
          notifyMutationSuccess(copy.toastSuccessAdjust);
          setAction(null);
          setQuantity('');
          setNote('');
        },
        onError: (err) => notifyMutationError(err, copy.toastSuccessAdjust),
      },
    );
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
                <TableHead>{copy.columns.assetType}</TableHead>
                <TableHead>{copy.columns.quantityAvailable}</TableHead>
                <TableHead>{copy.columns.quantityAssigned}</TableHead>
                <TableHead>{copy.columns.quantityMaintenance}</TableHead>
                <TableHead>{copy.columns.quantityLost}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.assetTypeId}>
                  <TableCell className='font-medium'>{row.assetTypeId ?? '—'}</TableCell>
                  <TableCell>{row.quantityAvailable ?? 0}</TableCell>
                  <TableCell>{row.quantityAssigned ?? 0}</TableCell>
                  <TableCell>{row.quantityMaintenance ?? 0}</TableCell>
                  <TableCell>{row.quantityLost ?? 0}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setAction({ mode: 'receive', assetTypeId: row.assetTypeId });
                          setQuantity('');
                          setNote('');
                        }}
                      >
                        {copy.receive}
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setAction({ mode: 'adjust', assetTypeId: row.assetTypeId });
                          setQuantity('');
                          setNote('');
                        }}
                      >
                        {copy.adjust}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > 20 ? (
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
            disabled={params.page * 20 >= pagination.total}
            onClick={() => void setParams({ page: params.page + 1 })}
          >
            ›
          </Button>
        </div>
      ) : null}

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className='sm:max-w-[420px]'>
          <form onSubmit={action?.mode === 'adjust' ? handleAdjust : handleReceive} className='space-y-4'>
            <DialogHeader>
              <DialogTitle>
                {action?.mode === 'adjust' ? copy.adjustTitle : copy.dialogTitle}
              </DialogTitle>
              <DialogDescription>
                {action?.mode === 'adjust' ? copy.adjustDescription : copy.dialogDescription}
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='invAssetType'>{copy.columns.assetType}</Label>
              <Input id='invAssetType' value={action?.assetTypeId ?? ''} disabled readOnly />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='invQty'>
                {action?.mode === 'adjust' ? 'Delta' : copy.fields.quantity}
              </Label>
              <Input
                id='invQty'
                type='number'
                min={action?.mode === 'adjust' ? undefined : 1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={
                  action?.mode === 'adjust' ? 'e.g. -2 hoặc +5' : copy.fields.quantity
                }
                required
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='invNote'>
                {action?.mode === 'adjust' ? copy.fields.reason : 'Ghi chú'}
              </Label>
              <Input
                id='invNote'
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setAction(null)}
                disabled={receiveMutation.isPending || adjustMutation.isPending}
              >
                {commonUiCopy.cancel}
              </Button>
              <Button
                type='submit'
                disabled={receiveMutation.isPending || adjustMutation.isPending}
              >
                {(receiveMutation.isPending || adjustMutation.isPending) && (
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                )}
                {action?.mode === 'adjust' ? copy.adjust : copy.receive}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}