'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryStates, parseAsString } from 'nuqs';
import {
  useApprovalRequestsQuery,
  useApprovalPoliciesQuery,
  useRequestApprovalMutation,
  useCancelApprovalRequestMutation,
} from '../api/queries';
import type { ApprovalRequest } from '../api/service';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { formatDateVN } from "@/lib/date";
import { perPageParser, pageParser } from '@/lib/pagination';

const REQUEST_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
  cancelled: { label: 'Đã hủy', variant: 'secondary' },
};

const STATUS_FILTER_OPTIONS = [
  { label: 'Chờ duyệt', value: 'pending' },
  { label: 'Đã duyệt', value: 'approved' },
  { label: 'Từ chối', value: 'rejected' },
  { label: 'Đã hủy', value: 'cancelled' },
];

const columnHelper = createColumnHelper<ApprovalRequest>();

export default function ApprovalRequestsListPage() {
  const [params] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    status: parseAsString,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    policyId: '',
    subjectType: '',
    subjectId: '',
  });

  const { data, error, isLoading, refetch } = useApprovalRequestsQuery({
    page: params.page,
    limit: params.perPage,
    status: params.status || undefined,
  });
  const { data: policiesData } = useApprovalPoliciesQuery({
    page: 1,
    limit: 50,
    isActive: true,
  });
  const policies = policiesData?.rows ?? [];

  const requestApprovalMutation = useRequestApprovalMutation();
  const cancelMutation = useCancelApprovalRequestMutation();

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.policyId || !form.subjectType.trim() || !form.subjectId.trim()) {
      return;
    }
    try {
      await requestApprovalMutation.mutateAsync({
        policyId: form.policyId,
        subjectType: form.subjectType.trim(),
        subjectId: form.subjectId.trim(),
      });
      setCreateOpen(false);
      setForm({ policyId: '', subjectType: '', subjectId: '' });
    } catch {
      /* handled by mutation */
    }
  };

  const requests = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / params.perPage));

  const columns = useMemo(() => [
    columnHelper.accessor((row) => `${row.subjectType}:${row.subjectId}`, {
      id: 'subject',
      header: 'Chủ đề',
      cell: ({ row }) => (
        <div>
          <span className='font-mono text-xs'>{row.original.subjectType}:{row.original.subjectId}</span>
          {row.original.policy?.name && (
            <div className='text-xs text-muted-foreground'>{row.original.policy.name}</div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Trạng thái',
      meta: {
        options: STATUS_FILTER_OPTIONS,
      },
      cell: ({ getValue }) => <StatusBadge status={getValue()} mapping={REQUEST_STATUS_MAP} />,
    }),
    columnHelper.accessor('currentStepIndex', {
      id: 'step',
      header: 'Bước',
      cell: ({ row }) => {
        const total = row.original.steps?.length ?? '?';
        return <span className='text-xs text-muted-foreground'>{row.original.currentStepIndex + 1} / {total}</span>;
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ getValue }) => {
        const date = getValue();
        return <span className='text-xs text-muted-foreground'>{formatDateVN(date)}</span>;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const req = row.original;
        if (req.status !== 'pending') return null;
        return (
          <div className='flex justify-end'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => cancelMutation.mutate(req.id)}
              disabled={cancelMutation.isPending}
            >
              Hủy yêu cầu
            </Button>
          </div>
        );
      },
    }),
  ], [cancelMutation]);

  const { table } = useDataTable({
    data: requests,
    columns,
    pageCount,
    tableId: 'approval-requests',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='yêu cầu phê duyệt'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-end'>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size='sm'>
              <Icons.plusCircle className='mr-1.5 h-4 w-4' />
              Tạo yêu cầu phê duyệt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo yêu cầu phê duyệt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRequest} className='space-y-4'>
              <div className='space-y-1.5'>
                <Label>Quy trình phê duyệt</Label>
                {policies.length > 0 ? (
                  <Select
                    value={form.policyId}
                    onValueChange={(val) =>
                      setForm((prev) => ({ ...prev, policyId: val }))
                    }
                  >
                    <SelectTrigger aria-label='Quy trình phê duyệt'>
                      <SelectValue placeholder='Chọn quy trình...' />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name ? `${p.name} (${p.key})` : p.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.policyId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, policyId: e.target.value }))
                    }
                    placeholder='Policy ID'
                  />
                )}
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='req-subject-type'>Loại đối tượng (Subject Type)</Label>
                <Input
                  id='req-subject-type'
                  value={form.subjectType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subjectType: e.target.value }))
                  }
                  placeholder='vd: expense_claim, requisition, offer'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='req-subject-id'>Mã đối tượng (Subject ID)</Label>
                <Input
                  id='req-subject-id'
                  value={form.subjectId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subjectId: e.target.value }))
                  }
                  placeholder='UUID đối tượng cần duyệt'
                  required
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type='submit'
                  disabled={requestApprovalMutation.isPending}
                >
                  Gửi yêu cầu
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.task className='size-10' />}
            title='Không có yêu cầu phê duyệt'
            compact
          />
        }
      >
        <DataTableToolbar table={table}>
          <DataTableFacetedFilter
            column={table.getColumn('status')!}
            title='Trạng thái'
            options={STATUS_FILTER_OPTIONS}
          />
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}
