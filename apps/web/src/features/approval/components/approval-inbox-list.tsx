'use client';

import { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryStates, parseAsInteger } from 'nuqs';
import { useApprovalInboxQuery, useDecideApprovalStepMutation } from '../api/queries';
import type { ApprovalStep } from '../api/service';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatDateVN } from "@/lib/date";
import { perPageParser, pageParser } from '@/lib/pagination';

const STEP_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ', variant: 'secondary' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  skipped: { label: 'Đã bỏ qua', variant: 'outline' },
};

const columnHelper = createColumnHelper<ApprovalStep>();

function DecideDialog({
  step,
  onClose,
}: {
  step: { requestId: string; stepIndex: number };
  onClose: () => void;
}) {
  const [comment, setComment] = useState('');
  const mutation = useDecideApprovalStepMutation();

  const handleDecide = async (decision: 'approve' | 'reject') => {
    try {
      await mutation.mutateAsync({ requestId: step.requestId, data: { stepIndex: step.stepIndex, decision, comment: comment || undefined } });
      onClose();
    } catch { /* handled */ }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Xét duyệt</DialogTitle></DialogHeader>
      <div className='space-y-4'>
        <div>
          <p className='text-sm text-muted-foreground'>Request ID: {step.requestId}</p>
          <p className='text-sm text-muted-foreground'>Bước: {step.stepIndex + 1}</p>
        </div>
        <div>
          <label className='text-sm font-medium'>Ghi chú (không bắt buộc)</label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder='Thêm ghi chú...' />
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>Hủy</Button>
          <Button variant='destructive' onClick={() => handleDecide('reject')} disabled={mutation.isPending}>
            Từ chối
          </Button>
          <Button onClick={() => handleDecide('approve')} disabled={mutation.isPending}>
            Duyệt
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export default function ApprovalInboxListPage() {
  const [decideTarget, setDecideTarget] = useState<{ requestId: string; stepIndex: number } | null>(null);
  const [params] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
  });

  const { data, error, isLoading, refetch } = useApprovalInboxQuery({
    page: params.page,
    limit: params.perPage,
  });

  const steps = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / params.perPage));

  const columns = useMemo(() => [
    columnHelper.accessor((row) => row.request?.subjectType ?? '—', {
      id: 'subject',
      header: 'Yêu cầu',
      cell: ({ row }) => {
        const step = row.original;
        return (
          <div>
            <span className='font-mono text-xs'>{step.requestId.substring(0, 8)}...</span>
            {step.request?.subjectType && (
              <div className='text-xs text-muted-foreground'>
                {step.request.subjectType}:{step.request.subjectId}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('stepIndex', {
      id: 'step',
      header: 'Bước',
      cell: ({ getValue }) => <Badge variant='outline'>Bước {getValue() + 1}</Badge>,
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ getValue }) => {
        const date = getValue();
        return <span className='text-xs text-muted-foreground'>{formatDateVN(date)}</span>;
      },
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ getValue }) => <StatusBadge status={getValue()} mapping={STEP_STATUS_MAP} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const step = row.original;
        return (
          <Dialog
            open={decideTarget?.requestId === step.requestId && decideTarget?.stepIndex === step.stepIndex}
            onOpenChange={(open) => {
              if (!open) setDecideTarget(null);
              else setDecideTarget({ requestId: step.requestId, stepIndex: step.stepIndex });
            }}
          >
            <DialogTrigger asChild>
              <Button size='sm'>Xét duyệt</Button>
            </DialogTrigger>
            {decideTarget?.requestId === step.requestId && (
              <DecideDialog
                step={decideTarget}
                onClose={() => setDecideTarget(null)}
              />
            )}
          </Dialog>
        );
      },
    }),
  ], [decideTarget]);

  const { table } = useDataTable({
    data: steps,
    columns,
    pageCount,
    tableId: 'approval-inbox',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='hộp thư phê duyệt'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.notification className='size-10' />}
            title='Không có phê duyệt chờ xử lý'
            compact
          />
        }
      />
    </div>
  );
}
