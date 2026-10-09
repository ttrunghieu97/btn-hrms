'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LeaveWorkflowHero } from './leave-workflow-hero';
import { LeaveTraceTimeline } from './leave-trace-timeline';
import {
  useApproveLeaveInboxRequest,
  useRejectLeaveInboxRequest,
  useCancelLeaveRequest,
} from '../api/mutations';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface LeaveRequestDetailItem {
  id: string;
  employeeId?: string;
  employeeName?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  reason?: string | null;
  totalUnits?: string;
}

interface LeaveRequestDetailDialogProps {
  item: LeaveRequestDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveRequestDetailDialog({
  item,
  open,
  onOpenChange,
}: LeaveRequestDetailDialogProps) {
  const user = useAuthStore((s) => s.user);
  const canApprove = hasPermission(user?.permissions ?? [], permissions.leave.approve) ||
    hasPermission(user?.permissions ?? [], permissions.leave.edit);
  const canCancel = true;

  const [decisionComment, setDecisionComment] = React.useState('');
  const [showRejectInput, setShowRejectInput] = React.useState(false);

  const approveMutation = useApproveLeaveInboxRequest();
  const rejectMutation = useRejectLeaveInboxRequest();
  const cancelMutation = useCancelLeaveRequest();

  if (!item) return null;

  const isPending =
    approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  const handleApprove = () => {
    approveMutation.mutate(
      {
        id: item.id,
        data: { comment: decisionComment || 'Đã phê duyệt' },
      },
      {
        onSuccess: () => {
          setDecisionComment('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    rejectMutation.mutate(
      {
        id: item.id,
        data: { comment: decisionComment || 'Không duyệt theo quy định' },
      },
      {
        onSuccess: () => {
          setShowRejectInput(false);
          setDecisionComment('');
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto p-6'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            Chi tiết quy trình nghỉ phép (Leave Request Workflow)
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-6 mt-2'>
          {/* Workflow Hero */}
          <LeaveWorkflowHero
            id={item.id}
            employeeName={item.employeeName}
            leaveTypeName={item.leaveTypeName}
            startDate={item.startDate}
            endDate={item.endDate}
            totalUnits={item.totalUnits}
            status={item.status || 'pending'}
            reason={item.reason}
            canApprove={canApprove}
            canCancel={canCancel}
            isActionPending={isPending}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={handleCancel}
          />

          {/* Optional rejection comment input if approver clicked reject */}
          {showRejectInput && (
            <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 space-y-2'>
              <label className='text-xs font-semibold text-destructive'>
                Nhập lý do từ chối đơn:
              </label>
              <div className='flex items-center gap-2'>
                <Input
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder='Ví dụ: Trùng lịch trực dự án quan trọng...'
                  className='text-xs h-8 bg-background'
                />
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={handleReject}
                  disabled={isPending}
                  className='h-8 text-xs shrink-0'
                >
                  Xác nhận từ chối
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => setShowRejectInput(false)}
                  className='h-8 text-xs shrink-0'
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {/* Audit Trace Timeline */}
          <div className='border-t border-border pt-4'>
            <LeaveTraceTimeline leaveRequestId={item.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
