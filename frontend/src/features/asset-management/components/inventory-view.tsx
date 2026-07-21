'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { inventoryQueryOptions } from '../api/queries';
import {
  useReceiveStock
} from '../api/mutations';
import type { AssetInventoryListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { ASSET_STATUS_MAP, type InventoryRow } from './status-maps';
import {
  notifyMutationError,
  notifyMutationSuccess,
} from '@/lib/mutation-feedback';
import { StatusBadge } from '@/components/ui/status-badge';
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
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const copy = assetManagementUiCopy.inventory;

export function InventoryView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: AssetInventoryListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status
      ? { status: params.status as any }
      : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    inventoryQueryOptions(),
  );
  const rows = extractList<InventoryRow>(data);
  const pagination = extractPagination(data);

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
        {/* create dialog skipped: YAGNI for now, add when specific subview needs it */}
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
    </div>
  );
}
