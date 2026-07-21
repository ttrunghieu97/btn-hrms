'use client';

import { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryStates, parseAsInteger } from 'nuqs';
import { useApprovalPoliciesQuery, useCreateApprovalPolicyMutation, useDeactivateApprovalPolicyMutation } from '../api/queries';
import type { ApprovalPolicy } from '../api/service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { perPageParser, pageParser } from '@/lib/pagination';

const columnHelper = createColumnHelper<ApprovalPolicy>();

function CreatePolicyDialog({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('{"steps": [{"approverUserId": null}]}');
  const mutation = useCreateApprovalPolicyMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync({ key, name: name || undefined, description: description || undefined, steps: JSON.parse(steps) });
      onClose();
    } catch { /* handled by mutation */ }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Tạo quy trình phê duyệt</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <Label>Key</Label>
          <Input value={key} onChange={(e) => setKey(e.target.value)} required placeholder='vd: expense_approval' />
        </div>
        <div>
          <Label>Tên</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Phê duyệt chi phí' />
        </div>
        <div>
          <Label>Mô tả</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Steps (JSON)</Label>
          <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} className='font-mono text-xs' rows={6} />
        </div>
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onClose}>Hủy</Button>
          <Button type='submit' disabled={mutation.isPending}>Tạo</Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function ApprovalPoliciesListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [params] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
  });

  const { data, error, isLoading, refetch } = useApprovalPoliciesQuery({
    page: params.page,
    limit: params.perPage,
  });

  const deactivateMutation = useDeactivateApprovalPolicyMutation();

  const policies = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / params.perPage));

  const columns = useMemo(() => [
    columnHelper.accessor('key', {
      id: 'key',
      header: 'Key',
      cell: ({ getValue }) => <span className='font-mono text-xs'>{getValue()}</span>,
    }),
    columnHelper.accessor('name', {
      id: 'name',
      header: 'Tên',
      cell: ({ getValue }) => getValue() ?? '-',
    }),
    columnHelper.accessor('version', {
      id: 'version',
      header: 'Phiên bản',
      cell: ({ getValue }) => <span>v{getValue()}</span>,
    }),
    columnHelper.accessor('isActive', {
      id: 'isActive',
      header: 'Trạng thái',
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'default' : 'secondary'}>
          {getValue() ? 'Hoạt động' : 'Ngừng'}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const policy = row.original;
        return policy.isActive ? (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => deactivateMutation.mutate(policy.id)}
          >
            <Icons.trash className='h-4 w-4' />
          </Button>
        ) : null;
      },
    }),
  ], [deactivateMutation]);

  const { table } = useDataTable({
    data: policies,
    columns,
    pageCount,
    tableId: 'approval-policies',
  });

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='quy trình phê duyệt'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <div />
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size='sm'>
              <Icons.plusCircle className='mr-1.5 h-4 w-4' />
              Tạo quy trình
            </Button>
          </DialogTrigger>
          {showCreate && <CreatePolicyDialog onClose={() => setShowCreate(false)} />}
        </Dialog>
      </div>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyState={
          <AppEmptyState
            icon={<Icons.shield className='size-10' />}
            title='Chưa có quy trình phê duyệt'
            description='Tạo quy trình phê duyệt đầu tiên để bắt đầu.'
            compact
          />
        }
      />
    </div>
  );
}
