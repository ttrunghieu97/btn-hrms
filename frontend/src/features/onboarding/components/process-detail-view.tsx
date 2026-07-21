'use client';

import { useQuery } from '@tanstack/react-query';
import { onboardingProcessDetailQueryOptions } from '../api/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Badge } from '@/components/ui/badge';

const ONBOARDING_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  in_progress: { label: 'Đang thực hiện', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
  terminated: { label: 'Kết thúc', variant: 'outline' },
};

const CHECKLIST_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  in_progress: { label: 'Đang thực hiện', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  skipped: { label: 'Bỏ qua', variant: 'secondary' },
};

interface ProcessDetailProps {
  processId: string;
}

export function OnboardingProcessDetailView({ processId }: ProcessDetailProps) {
  const { data, error, isLoading, refetch } = useQuery(onboardingProcessDetailQueryOptions(processId));

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    );
  }

  if (error) {
    return (
      <QueryErrorAlert error={error} subject='Chi tiết onboarding' onRetry={() => void refetch()} />
    );
  }

  const process = data as unknown as {
    id: string;
    employeeId: string;
    templateId: string | null;
    type: string;
    status: string;
    startDate: string;
    targetEndDate: string | null;
    completedAt: string | null;
    assignedHrUserId: string | null;
    createdAt: string;
    updatedAt: string;
    checklistItems: Array<{
      id: string;
      title: string;
      dueDaysOffset: number;
      mandatory: boolean;
      dueDate: string | null;
      isCompleted: boolean;
      completedAt: string | null;
      completedByUserID: string | null;
      status: string;
    }>;
  } | undefined;

  if (!process) {
    return <div className='text-muted-foreground text-sm p-4'>Không tìm thấy quy trình</div>;
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-lg font-semibold'>Chi tiết Onboarding</h1>
          <p className='text-sm text-muted-foreground'>Mã số: {process.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={process.status} mapping={ONBOARDING_STATUS_MAP} />
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Nhân viên</CardTitle></CardHeader>
          <CardContent><p className='font-mono text-xs'>{process.employeeId}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Template</CardTitle></CardHeader>
          <CardContent><p>{process.templateId?.slice(0, 8) ?? '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Ngày bắt đầu</CardTitle></CardHeader>
          <CardContent><p>{process.startDate}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className='text-sm'>HR phụ trách</CardTitle></CardHeader>
          <CardContent><p className='font-mono text-xs'>{process.assignedHrUserId ?? '—'}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Checklist</CardTitle>
          <p className='text-sm text-muted-foreground'>
            {process.checklistItems.filter((i) => i.isCompleted).length}/{process.checklistItems.length} mục hoàn thành
          </p>
        </CardHeader>
        <CardContent>
          {process.checklistItems.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có mục nào trong checklist</p>
          ) : (
            <div className='space-y-2'>
              {process.checklistItems.map((item) => (
                <div key={item.id} className='flex items-center justify-between rounded border p-3'>
                  <div className='flex items-center gap-2'>
                    <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                      {item.title}
                    </span>
                    {item.mandatory && <Badge variant='outline' className='text-xs'>Bắt buộc</Badge>}
                  </div>
                  <StatusBadge status={item.status} mapping={CHECKLIST_STATUS_MAP} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
