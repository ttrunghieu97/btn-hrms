'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';
import { benefitEnrollmentsQueryOptions } from '../api/queries';
import { useApproveEnrollment, useCancelEnrollment } from '../api/mutations';
import type { BenefitEnrollmentListFilters } from '../queries/benefit-queries';
import { extractList, extractPagination } from '@/lib/api-extract';
import { ENROLLMENT_STATUS_MAP, type BenefitEnrollmentRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { formatDateVN } from "@/lib/date";
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
import { benefitsUiCopy } from '@/locales/vi/app-copy';
import { pageParser, perPageParser, limitParser } from '@/lib/pagination';

const copy = benefitsUiCopy.enrollments;

export function BenefitEnrollmentsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const filters: BenefitEnrollmentListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    benefitEnrollmentsQueryOptions(filters),
  );
  const rows = extractList<BenefitEnrollmentRow>(data);
  const pagination = extractPagination(data);

  const approveEnrollment = useApproveEnrollment();
  const cancelEnrollment = useCancelEnrollment();

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
                <TableHead>{copy.columns.employeeName}</TableHead>
                <TableHead>{copy.columns.planName}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.coverageType}</TableHead>
                <TableHead>{copy.columns.effectiveFrom}</TableHead>
                <TableHead>{copy.columns.enrolledAt}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.employeeName ?? '—'}</TableCell>
                  <TableCell>{row.planName ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge mapping={ENROLLMENT_STATUS_MAP} status={row.status ?? 'pending'} />
                  </TableCell>
                  <TableCell>{row.coverageType ?? '—'}</TableCell>
                  <TableCell>{row.effectiveFrom ? formatDateVN(row.effectiveFrom) : '—'}</TableCell>
                  <TableCell>{row.enrolledAt ? formatDateVN(row.enrolledAt) : '—'}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {row.status === 'pending' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => approveEnrollment.mutate({ id: row.id })}
                          disabled={approveEnrollment.isPending}
                        >
                          Duyệt
                        </Button>
                      ) : null}
                      {row.status === 'pending' || row.status === 'approved' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => cancelEnrollment.mutate({ id: row.id })}
                          disabled={cancelEnrollment.isPending}
                        >
                          Hủy
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
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
