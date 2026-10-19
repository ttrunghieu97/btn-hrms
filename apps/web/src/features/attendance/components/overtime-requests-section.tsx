'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getOvertimeControllerListQueryKey,
  useOvertimeControllerApprove,
  useOvertimeControllerList,
  useOvertimeControllerReject,
  useOvertimeControllerSubmit,
} from '@/api/generated/attendance-overtime/attendance-overtime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { extractList } from '@/lib/api-extract';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { formatDateVN } from '@/lib/date';
import { attendance, hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { toDateString } from '../utils/attendance-utils';

export interface OvertimeRequestItem {
  id: string;
  employeeId: string;
  workDate: string;
  candidateMinutes?: number | null;
  requestedMinutes: number;
  approvedMinutes?: number | null;
  status: string;
  requestNote?: string | null;
  rejectionReason?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
}

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Chờ duyệt',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  APPROVED: {
    label: 'Đã duyệt',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
};

function formatMinutesLabel(mins: number | null | undefined): string {
  if (mins === null || mins === undefined) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}p (${mins} phút)`;
  if (h > 0) return `${h} giờ (${mins} phút)`;
  return `${m} phút`;
}

export function OvertimeRequestsSection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userPerms = user?.permissions ?? [];
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin || userPerms.includes('ALL') || userPerms.includes('sys:all'),
  );
  const canSubmit =
    isSuperAdmin || hasPermission(userPerms, attendance.overtimeSubmit);
  const canApprove =
    isSuperAdmin || hasPermission(userPerms, attendance.overtimeApprove);

  const listQuery = useOvertimeControllerList();
  const items = React.useMemo(
    () => extractList<OvertimeRequestItem>(listQuery.data),
    [listQuery.data],
  );

  // Submit Dialog State
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [workDate, setWorkDate] = React.useState(() => toDateString(new Date()));
  const [requestedMinutes, setRequestedMinutes] = React.useState('120');
  const [requestNote, setRequestNote] = React.useState('');

  // Approve / Reject Dialog State
  const [decisionTarget, setDecisionTarget] = React.useState<{
    item: OvertimeRequestItem;
    mode: 'approve' | 'reject';
  } | null>(null);
  const [approvedMinutesInput, setApprovedMinutesInput] = React.useState('');
  const [rejectReason, setRejectReason] = React.useState('');

  const invalidateOvertime = () => {
    void queryClient.invalidateQueries({
      queryKey: getOvertimeControllerListQueryKey(),
    });
  };

  const submitMut = useOvertimeControllerSubmit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã gửi đăng ký làm thêm giờ (OT) thành công.');
        setSubmitOpen(false);
        setRequestNote('');
        invalidateOvertime();
      },
      onError: (err) => {
        toast.error(
          getVietnameseApiErrorMessage(err, 'Không thể gửi đăng ký làm thêm giờ'),
        );
      },
    },
  });

  const approveMut = useOvertimeControllerApprove({
    mutation: {
      onSuccess: () => {
        toast.success('Đã phê duyệt yêu cầu làm thêm giờ.');
        setDecisionTarget(null);
        invalidateOvertime();
      },
      onError: (err) => {
        toast.error(
          getVietnameseApiErrorMessage(err, 'Không thể phê duyệt yêu cầu OT'),
        );
      },
    },
  });

  const rejectMut = useOvertimeControllerReject({
    mutation: {
      onSuccess: () => {
        toast.success('Đã từ chối yêu cầu làm thêm giờ.');
        setDecisionTarget(null);
        setRejectReason('');
        invalidateOvertime();
      },
      onError: (err) => {
        toast.error(
          getVietnameseApiErrorMessage(err, 'Không thể từ chối yêu cầu OT'),
        );
      },
    },
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(requestedMinutes);
    if (!workDate || Number.isNaN(mins) || mins < 15) {
      toast.error('Số phút đăng ký OT tối thiểu là 15 phút.');
      return;
    }
    submitMut.mutate({
      data: {
        workDate,
        requestedMinutes: mins,
        ...(requestNote.trim() ? { requestNote: requestNote.trim() } : {}),
      },
    });
  };

  const handleDecisionConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionTarget) return;
    if (decisionTarget.mode === 'approve') {
      const overrideMins = approvedMinutesInput.trim()
        ? Number(approvedMinutesInput.trim())
        : undefined;
      approveMut.mutate({
        id: decisionTarget.item.id,
        data: {
          ...(overrideMins && !Number.isNaN(overrideMins)
            ? { approvedMinutes: overrideMins }
            : {}),
        },
      });
    } else {
      if (!rejectReason.trim()) {
        toast.error('Vui lòng nhập lý do từ chối yêu cầu làm thêm giờ.');
        return;
      }
      rejectMut.mutate({
        id: decisionTarget.item.id,
        data: { reason: rejectReason.trim() },
      });
    }
  };

  return (
    <>
      <Card className='border-border/70 bg-card shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between border-b px-4 py-3'>
          <div className='flex items-center gap-2.5'>
            <div className='rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400'>
              <Icons.clock className='size-4' />
            </div>
            <div>
              <CardTitle className='text-sm font-semibold'>
                Đăng ký &amp; Phê duyệt Làm thêm giờ (Overtime)
              </CardTitle>
              <p className='text-xs text-muted-foreground'>
                Danh sách yêu cầu tăng ca và trạng thái xét duyệt
              </p>
            </div>
          </div>

          {canSubmit && (
            <Button size='sm' onClick={() => setSubmitOpen(true)} className='h-8 text-xs'>
              <Icons.add className='mr-1.5 size-3.5' />
              Đăng ký OT
            </Button>
          )}
        </CardHeader>

        <CardContent className='p-4'>
          {listQuery.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : items.length === 0 ? (
            <p className='py-4 text-center text-xs text-muted-foreground'>
              Chưa có yêu cầu làm thêm giờ (OT) nào.
            </p>
          ) : (
            <div className='divide-y divide-border/60'>
              {items.slice(0, 10).map((item) => {
                const statusKey = (item.status || 'PENDING').toUpperCase();
                const statusMeta = STATUS_BADGE_MAP[statusKey] ?? {
                  label: item.status,
                  className: '',
                };
                const isPending = statusKey === 'PENDING';
                const isSelfRequest =
                  Boolean(user?.employeeId) &&
                  String(user?.employeeId) === String(item.employeeId);

                return (
                  <div
                    key={item.id}
                    className='flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-xs'
                  >
                    <div className='space-y-1 min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-semibold text-foreground'>
                          Ngày công: {formatDateVN(item.workDate)}
                        </span>
                        <Badge variant='outline' className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                        <span className='text-muted-foreground'>
                          Đăng ký: <strong className='text-foreground'>{formatMinutesLabel(item.requestedMinutes)}</strong>
                        </span>
                        {item.approvedMinutes !== null && item.approvedMinutes !== undefined && (
                          <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                            · Duyệt: {formatMinutesLabel(item.approvedMinutes)}
                          </span>
                        )}
                      </div>
                      {item.requestNote && (
                        <p className='text-muted-foreground'>
                          Lý do tăng ca: <span className='text-foreground'>{item.requestNote}</span>
                        </p>
                      )}
                      {item.rejectionReason && (
                        <p className='text-rose-600 dark:text-rose-400'>
                          Lý do từ chối: {item.rejectionReason}
                        </p>
                      )}
                    </div>

                    {canApprove && isPending && (!isSelfRequest || isSuperAdmin) && (
                      <div className='flex items-center gap-1.5 shrink-0'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                          onClick={() => {
                            setApprovedMinutesInput(String(item.requestedMinutes));
                            setDecisionTarget({ item, mode: 'approve' });
                          }}
                        >
                          <Icons.check className='mr-1 size-3.5' />
                          Duyệt
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs text-destructive hover:text-destructive'
                          onClick={() => {
                            setRejectReason('');
                            setDecisionTarget({ item, mode: 'reject' });
                          }}
                        >
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit OT Request Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Đăng ký làm thêm giờ (Overtime)</DialogTitle>
            <DialogDescription>
              Gửi yêu cầu xác nhận số phút làm thêm giờ cho ca làm việc của bạn.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className='space-y-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label>Ngày làm thêm *</Label>
                <Input
                  type='date'
                  required
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Số phút làm thêm *</Label>
                <Input
                  type='number'
                  min={15}
                  max={720}
                  step={15}
                  required
                  value={requestedMinutes}
                  onChange={(e) => setRequestedMinutes(e.target.value)}
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label>Nội dung công việc / Lý do tăng ca</Label>
              <Textarea
                rows={3}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder='Mô tả công việc thực hiện trong thời gian làm thêm giờ...'
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setSubmitOpen(false)}
                disabled={submitMut.isPending}
              >
                Huỷ
              </Button>
              <Button type='submit' disabled={submitMut.isPending}>
                {submitMut.isPending ? 'Đang gửi...' : 'Gửi đăng ký'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject OT Dialog */}
      <Dialog
        open={Boolean(decisionTarget)}
        onOpenChange={(open) => {
          if (!open) setDecisionTarget(null);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {decisionTarget?.mode === 'approve'
                ? 'Phê duyệt yêu cầu làm thêm giờ'
                : 'Từ chối yêu cầu làm thêm giờ'}
            </DialogTitle>
            <DialogDescription>
              Ngày làm việc:{' '}
              <strong>
                {decisionTarget ? formatDateVN(decisionTarget.item.workDate) : ''}
              </strong>{' '}
              — Đăng ký:{' '}
              <strong>
                {decisionTarget
                  ? formatMinutesLabel(decisionTarget.item.requestedMinutes)
                  : ''}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDecisionConfirm} className='space-y-4'>
            {decisionTarget?.mode === 'approve' ? (
              <div className='space-y-1.5'>
                <Label>Số phút OT phê duyệt</Label>
                <Input
                  type='number'
                  min={15}
                  max={720}
                  value={approvedMinutesInput}
                  onChange={(e) => setApprovedMinutesInput(e.target.value)}
                />
              </div>
            ) : (
              <div className='space-y-1.5'>
                <Label>Lý do từ chối *</Label>
                <Textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder='Nhập lý do từ chối yêu cầu làm thêm giờ...'
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setDecisionTarget(null)}
                disabled={approveMut.isPending || rejectMut.isPending}
              >
                Huỷ
              </Button>
              <Button
                type='submit'
                variant={decisionTarget?.mode === 'reject' ? 'destructive' : 'default'}
                disabled={approveMut.isPending || rejectMut.isPending}
              >
                {approveMut.isPending || rejectMut.isPending
                  ? 'Đang xử lý...'
                  : 'Xác nhận'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
