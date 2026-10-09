'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { onboardingProcessDetailQueryOptions } from '../api/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { GlobalWorkflowHero, type WorkflowStep } from '@/components/workflow/global-workflow-hero';
import {
  useCompleteOnboardingItem,
  useReopenOnboardingItem,
  useSkipOnboardingItem,
} from '../api/mutations';

const ONBOARDING_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  in_progress: { label: 'Đang thực hiện', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
  terminated: { label: 'Kết thúc', variant: 'outline' },
};

const ONBOARDING_STEPS: WorkflowStep[] = [
  { key: 'pending', label: '1. Tiếp nhận hồ sơ', description: 'Chuẩn bị tài liệu & bàn giao' },
  { key: 'in_progress', label: '2. Đào tạo & Hội nhập', description: 'Checklist công việc & thiết bị' },
  { key: 'completed', label: '3. Hoàn tất hội nhập', description: 'Chuyển sang làm việc chính thức' },
];

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
  const completeMutation = useCompleteOnboardingItem();
  const reopenMutation = useReopenOnboardingItem();
  const skipMutation = useSkipOnboardingItem();

  if (isLoading) {
    return (
      <div className='space-y-4 p-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-6'>
        <QueryErrorAlert error={error} subject='Chi tiết onboarding' onRetry={() => void refetch()} />
      </div>
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
    return <div className='text-muted-foreground text-sm p-6'>Không tìm thấy quy trình</div>;
  }

  let currentStepIndex = 0;
  if (process.status === 'pending') currentStepIndex = 0;
  else if (process.status === 'in_progress') currentStepIndex = 1;
  else if (process.status === 'completed') currentStepIndex = 2;

  const failedStepIndex =
    process.status === 'cancelled' || process.status === 'terminated'
      ? currentStepIndex
      : undefined;

  const completedCount = process.checklistItems.filter((i) => i.isCompleted).length;
  const totalCount = process.checklistItems.length;

  let nextActor = 'Chuyên viên Nhân sự & Quản lý';
  let actionGuidance = 'Theo dõi và hỗ trợ nhân viên mới.';
  let actionResultPreview = '';

  if (process.status === 'pending') {
    nextActor = process.assignedHrUserId || 'Chuyên viên Nhân sự';
    actionGuidance =
      'Chuẩn bị hợp đồng lao động, bàn giao thiết bị làm việc và gửi thư chào mừng nhân viên mới.';
    actionResultPreview = 'Chuyển sang giai đoạn Đào tạo & Hội nhập.';
  } else if (process.status === 'in_progress') {
    nextActor = 'Nhân viên mới & Quản lý trực tiếp';
    actionGuidance = `Đã hoàn thành ${completedCount}/${totalCount} mục checklist. Nhân viên cần hoàn thành các nhiệm vụ hội nhập còn lại.`;
    actionResultPreview = 'Chuyển sang giai đoạn Hoàn tất hội nhập.';
  } else if (process.status === 'completed') {
    nextActor = 'Đã hoàn tất quy trình';
    actionGuidance =
      'Quy trình hội nhập thành công. Nhân viên đã tiếp nhận đầy đủ văn hóa và chuyển sang giai đoạn chính thức.';
    actionResultPreview = 'Nhân viên chính thức gia nhập tổ chức.';
  } else if (process.status === 'cancelled' || process.status === 'terminated') {
    nextActor = 'Quy trình đã dừng';
    actionGuidance = 'Thủ tục hội nhập đã kết thúc trước thời hạn.';
  }

  const heroActions = (
    <Button variant='outline' size='sm' asChild className='text-xs h-8'>
      <Link href='/onboarding'>
        <Icons.chevronLeft className='mr-1 size-3.5' />
        Quay lại danh sách
      </Link>
    </Button>
  );

  const targetDateText = process.completedAt
    ? formatDateVN(process.completedAt)
    : process.targetEndDate
      ? formatDateVN(process.targetEndDate)
      : '—';

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-6'>
      <GlobalWorkflowHero
        title={`Hội nhập nhân viên: ${process.employeeId}`}
        badge={<StatusBadge status={process.status} mapping={ONBOARDING_STATUS_MAP} />}
        subtitle={`Ngày bắt đầu: ${process.startDate ? formatDateVN(process.startDate) : '—'} • Dự kiến hoàn thành: ${targetDateText} • Mã quy trình: ${process.id.slice(0, 8)}`}
        steps={ONBOARDING_STEPS}
        currentStepIndex={currentStepIndex}
        failedStepIndex={failedStepIndex}
        nextActor={nextActor}
        actionGuidance={actionGuidance}
        actionResultPreview={actionResultPreview}
        actions={heroActions}
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Checklist Hội nhập</CardTitle>
          <p className='text-sm text-muted-foreground'>
            {completedCount}/{totalCount} mục đã hoàn thành
          </p>
        </CardHeader>
        <CardContent>
          {process.checklistItems.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có mục nào trong checklist</p>
          ) : (
            <div className='space-y-3'>
              {process.checklistItems.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between rounded-lg border p-3.5 bg-card hover:bg-muted/30 transition-colors'
                >
                  <div className='flex items-start gap-3'>
                    <div className='mt-0.5'>
                      {item.isCompleted ? (
                        <Icons.check className='size-5 text-emerald-600 dark:text-emerald-400' />
                      ) : (
                        <Icons.circle className='size-5 text-muted-foreground/40' />
                      )}
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-sm font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {item.title}
                        </span>
                        {item.mandatory && (
                          <Badge
                            variant='outline'
                            className='text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 border-amber-300'
                          >
                            Bắt buộc
                          </Badge>
                        )}
                      </div>
                      {item.completedAt && (
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Hoàn tất: {formatDateVN(item.completedAt)}{' '}
                          {item.completedByUserID ? `• Bởi user: ${item.completedByUserID.slice(0, 8)}` : ''}
                        </p>
                      )}
                      {item.dueDate && !item.isCompleted && (
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Hạn chót: {formatDateVN(item.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={item.status} mapping={CHECKLIST_STATUS_MAP} />
                    {!item.isCompleted && item.status !== 'skipped' ? (
                      <div className='flex items-center gap-1.5'>
                        <Button
                          size='sm'
                          className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                          onClick={() => completeMutation.mutate({ processId: process.id, itemId: item.id })}
                          disabled={completeMutation.isPending}
                        >
                          <Icons.check className='size-3.5 mr-1' />
                          Hoàn thành
                        </Button>
                        {!item.mandatory && (
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 text-xs text-muted-foreground hover:text-foreground'
                            onClick={() => skipMutation.mutate({ processId: process.id, itemId: item.id })}
                            disabled={skipMutation.isPending}
                          >
                            Bỏ qua
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 text-xs'
                        onClick={() => reopenMutation.mutate({ processId: process.id, itemId: item.id })}
                        disabled={reopenMutation.isPending}
                      >
                        <Icons.refresh className='size-3.5 mr-1' />
                        Mở lại
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
