'use client';

import { useQuery } from '@tanstack/react-query';
import { leavePoliciesQueryOptions, leaveTypesQueryOptions } from '@/features/leave/api/queries';
import { extractList } from '@/lib/api-extract';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';

interface LeavePolicyRow {
  id: string;
  name: string;
  description?: string;
  paidDays?: number;
  requiresApproval?: boolean;
  isActive?: boolean;
}

interface LeaveTypeRow {
  id: string;
  name: string;
  description?: string;
  unit?: string;
}

function PoliciesTable() {
  const { data, error, isLoading, refetch } = useQuery(leavePoliciesQueryOptions());
  const policies = extractList<LeavePolicyRow>(data);

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='Chính sách nghỉ phép'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Chính sách nghỉ phép</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-2'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-10 w-full animate-pulse rounded bg-muted' />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <AppEmptyState icon={<Icons.page className='size-8' />} title='Chưa có chính sách nào' compact />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên chính sách</TableHead>
                <TableHead>Số ngày hưởng</TableHead>
                <TableHead>Cần duyệt</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className='font-medium'>{p.name}</TableCell>
                  <TableCell>{p.paidDays ?? '—'}</TableCell>
                  <TableCell>{p.requiresApproval ? 'Có' : 'Không'}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={p.isActive ? 'active' : 'inactive'}
                      mapping={{ active: { label: 'Hoạt động', variant: 'default' }, inactive: { label: 'Tạm dừng', variant: 'outline' } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveTypesTable() {
  const { data, error, isLoading, refetch } = useQuery(leaveTypesQueryOptions());
  const types = extractList<LeaveTypeRow>(data);

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='Loại nghỉ phép'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Loại nghỉ phép</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-2'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-10 w-full animate-pulse rounded bg-muted' />
            ))}
          </div>
        ) : types.length === 0 ? (
          <AppEmptyState icon={<Icons.forms className='size-8' />} title='Chưa có loại nghỉ phép nào' compact />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Đơn vị</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className='font-medium'>{t.name}</TableCell>
                  <TableCell className='text-muted-foreground'>{t.description ?? '—'}</TableCell>
                  <TableCell>{t.unit ?? 'ngày'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function LeavePoliciesView() {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-6'>
      <h1 className='text-lg font-semibold'>Quản lý chính sách nghỉ phép</h1>
      <div className='grid gap-6 lg:grid-cols-2'>
        <PoliciesTable />
        <LeaveTypesTable />
      </div>
    </div>
  );
}
