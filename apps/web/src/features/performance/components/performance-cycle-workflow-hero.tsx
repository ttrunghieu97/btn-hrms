'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { cn } from '@/lib/utils';
import { CYCLE_STATUS_MAP, type PerformanceCycleRow } from './status-maps';
import { useTransitionCycle } from '../api/mutations';

interface PerformanceCycleWorkflowHeroProps {
  cycle: PerformanceCycleRow;
  onClose?: () => void;
}

const CYCLE_STEPS = [
  { key: 'draft', label: '1. Khởi tạo' },
  { key: 'planning', label: '2. Lập kế hoạch' },
  { key: 'self_review', label: '3. Tự đánh giá' },
  { key: 'manager_review', label: '4. Quản lý đánh giá' },
  { key: 'calibration', label: '5. Hiệu chỉnh' },
  { key: 'ready_for_approval', label: '6. Trình duyệt' },
  { key: 'approved', label: '7. Đã phê duyệt' },
  { key: 'published', label: '8. Công bố kết quả' },
  { key: 'closed', label: '9. Đóng chu kỳ' },
];

const CYCLE_ACTIONS: Record<string, { action: string; label: string; variant?: 'default' | 'outline' | 'secondary' }[]> = {
  draft: [{ action: 'open-planning', label: 'Mở lập kế hoạch mục tiêu', variant: 'default' }],
  planning: [{ action: 'start-self-review', label: 'Bắt đầu tự đánh giá', variant: 'default' }],
  self_review: [{ action: 'start-manager-review', label: 'Chuyển sang Quản lý đánh giá', variant: 'default' }],
  manager_review: [{ action: 'start-calibration', label: 'Mở phiên hiệu chỉnh (Calibration)', variant: 'default' }],
  calibration: [{ action: 'submit-for-approval', label: 'Trình duyệt kết quả đánh giá', variant: 'default' }],
  ready_for_approval: [{ action: 'approve', label: 'Phê duyệt chu kỳ', variant: 'default' }],
  approved: [{ action: 'publish', label: 'Công bố kết quả tới nhân viên', variant: 'default' }],
  published: [{ action: 'close', label: 'Đóng chu kỳ đánh giá', variant: 'outline' }],
};

export function PerformanceCycleWorkflowHero({
  cycle,
  onClose,
}: PerformanceCycleWorkflowHeroProps) {
  const transitionCycle = useTransitionCycle();
  const status = cycle.status || 'draft';

  const stepKeys = CYCLE_STEPS.map((s) => s.key);
  const activeIndex = stepKeys.indexOf(status) >= 0 ? stepKeys.indexOf(status) : 0;

  const nextActorInfo = React.useMemo(() => {
    switch (status) {
      case 'draft':
        return {
          actor: 'HR Specialist / Trưởng phòng Nhân sự',
          action: 'Kiểm tra cấu hình tiêu chí và nhấn Mở kế hoạch để nhân viên bắt đầu đăng ký mục tiêu KPI/OKR.',
        };
      case 'planning':
        return {
          actor: 'Nhân viên & Quản lý trực tiếp',
          action: 'Nhân viên thiết lập mục tiêu công việc và người quản lý duyệt kế hoạch. Sau khi hoàn tất, bấm Bắt đầu tự đánh giá.',
        };
      case 'self_review':
        return {
          actor: 'Toàn bộ nhân viên trong chu kỳ',
          action: 'Nhân viên thực hiện tự chấm điểm và viết báo cáo kết quả hoàn thành mục tiêu cá nhân.',
        };
      case 'manager_review':
        return {
          actor: 'Quản lý trực tiếp (Direct Managers)',
          action: 'Quản lý đánh giá hiệu suất, đưa ra điểm số và nhận xét năng lực cho từng thành viên trong nhóm.',
        };
      case 'calibration':
        return {
          actor: 'Hội đồng nhân sự (HR Calibration Committee)',
          action: 'Cân đối phân bổ điểm số (bell curve / rating distribution) giữa các bộ phận để đảm bảo tính công bằng.',
        };
      case 'ready_for_approval':
        return {
          actor: 'Ban Giám đốc (Leadership / HR Director)',
          action: 'Xem xét báo cáo tổng hợp xếp loại và phê duyệt kết quả cuối cùng.',
        };
      case 'approved':
        return {
          actor: 'Ban Nhân sự',
          action: 'Kết quả đã phê duyệt. Nhấn Công bố để gửi thông báo điểm và phản hồi tới từng nhân viên.',
        };
      case 'published':
        return {
          actor: 'Toàn hệ thống',
          action: 'Kết quả đã được công bố. Nhân viên xem được đánh giá và ghi nhận vào hồ sơ năng lực.',
        };
      case 'closed':
        return {
          actor: 'Đã hoàn tất',
          action: 'Chu kỳ đánh giá đã chính thức đóng. Dữ liệu được lưu trữ làm căn cứ xét thưởng, tăng lương và thăng tiến.',
        };
      default:
        return {
          actor: 'Ban Nhân sự',
          action: 'Điều phối quy trình đánh giá hiệu suất.',
        };
    }
  }, [status]);

  const actions = CYCLE_ACTIONS[status] ?? [];

  return (
    <Card className='border-primary/20 bg-card shadow-sm'>
      <CardContent className='p-6'>
        {/* Top Header */}
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-xl font-bold tracking-tight text-foreground'>
                {cycle.name}
              </h2>
              <StatusBadge status={status} mapping={CYCLE_STATUS_MAP} />
            </div>
            <p className='text-muted-foreground mt-1 text-sm'>
              Thời gian thực hiện: <span className='font-medium text-foreground'>{cycle.startsOn ? formatDateVN(cycle.startsOn) : '—'}</span>
              {' → '}
              <span className='font-medium text-foreground'>{cycle.endsOn ? formatDateVN(cycle.endsOn) : '—'}</span>
            </p>
          </div>

          <div className='flex items-center gap-2'>
            {actions.map((act) => (
              <Button
                key={act.action}
                size='sm'
                variant={act.variant || 'default'}
                className='text-xs font-medium gap-1.5'
                disabled={transitionCycle.isPending}
                onClick={() => transitionCycle.mutate({ id: cycle.id, action: act.action })}
              >
                {transitionCycle.isPending && <Icons.spinner className='size-3.5 animate-spin' />}
                <Icons.check className='size-3.5' />
                {act.label}
              </Button>
            ))}
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose} className='text-xs'>
                Đóng
              </Button>
            )}
          </div>
        </div>

        {/* Visual Stepper */}
        <div className='mt-6 border-t border-border pt-4'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
            Tiến trình chu kỳ đánh giá (Performance Cycle Stepper)
          </p>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2'>
            {CYCLE_STEPS.map((step, idx) => {
              const isDone = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div
                  key={step.key}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border p-2 text-xs transition-colors',
                    isDone && 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300',
                    isCurrent && 'border-primary bg-primary/5 font-semibold text-primary shadow-xs',
                    !isDone && !isCurrent && 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
                  )}
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>{step.label}</span>
                    {isDone && <Icons.check className='size-3 text-emerald-600 dark:text-emerald-400' />}
                    {isCurrent && <span className='size-2 rounded-full bg-primary animate-pulse' />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Actor Guidance Callout */}
        <div className='mt-4 flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs'>
          <Icons.activity className='size-4 text-primary shrink-0 mt-0.5' />
          <div className='flex-1'>
            <div className='flex items-center gap-2 font-medium text-foreground'>
              <span>Trách nhiệm tiếp theo:</span>
              <span className='rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[11px] font-semibold'>
                {nextActorInfo.actor}
              </span>
            </div>
            <p className='mt-1 text-muted-foreground leading-relaxed'>
              {nextActorInfo.action}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
