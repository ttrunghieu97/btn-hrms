'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { issuesQueryOptions } from '../api/queries';
import { formatDateVN } from "@/lib/date";
import {
  useIssueAsset
} from '../api/mutations';
import type { AssetIssueListFilters } from '../queries/asset-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { ISSUE_LINE_STATUS_MAP, type AssetIssueRow } from './status-maps';
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

const copy = assetManagementUiCopy.issues;

export function AssetIssuesView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: AssetIssueListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status
      ? { status: params.status as any }
      : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    issuesQueryOptions(filters),
  );
  const rows = extractList<AssetIssueRow>(data);
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

                <TableHead>{copy.columns.employee}</TableHead>
                <TableHead>{copy.columns.issuedAt}</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id ?? Math.random().toString()}>

                  <TableCell className='font-medium'>{row.employeeId ?? '—'}</TableCell>
                  <TableCell>{row.issuedAt ? formatDateVN(row.issuedAt) : '—'}</TableCell>

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
    </div>
  );
}
