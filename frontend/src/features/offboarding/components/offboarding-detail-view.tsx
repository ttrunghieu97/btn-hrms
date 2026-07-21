'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOffboardingDetail } from '../queries';
import {
  useCompleteChecklistItem,
  useDecideClearance,
  useScheduleExitInterview,
  useRecordExitInterview,
  useCompleteOffboarding,
} from '../api/mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';

const OFFBOARDING_STATUS_MAP: StatusMap = {
  initiated: { label: 'Khởi tạo', variant: 'outline' },
  in_progress: { label: 'Đang xử lý', variant: 'secondary' },
  clearance_pending: { label: 'Chờ duyệt', variant: 'outline' },
  awaiting_settlement: { label: 'Chờ thanh toán', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
};

const CLEARANCE_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  rejected: { label: 'Từ chối', variant: 'destructive' },
};

const CHECKLIST_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  skipped: { label: 'Bỏ qua', variant: 'secondary' },
};

interface ChecklistItem {
  id: string;
  title: string;
  mandatory: boolean;
  status: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

interface ClearanceItem {
  id: string;
  department: string;
  decision: string;
  decidedAt?: string | null;
  note?: string | null;
}

interface DetailProps {
  processId: string;
}

export function OffboardingDetailView({ processId }: DetailProps) {
  const { data, error, isLoading, refetch } = useOffboardingDetail(processId);
  const completeItem = useCompleteChecklistItem();
  const decideClearance = useDecideClearance();
  const scheduleInterview = useScheduleExitInterview();
  const recordInterview = useRecordExitInterview();
  const completeOffboarding = useCompleteOffboarding();

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    interviewerUserId: '',
    scheduledAt: '',
  });
  const [recordNote, setRecordNote] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);

  const process = data as {
    id: string;
    employeeId: string;
    status: string;
    startDate: string;
    targetEndDate?: string | null;
    completedAt?: string | null;
    checklistItems: ChecklistItem[];
    clearances: ClearanceItem[];
    exitInterview?: {
      id: string;
      scheduledAt: string | null;
      conductedAt: string | null;
    } | null;
    settlement?: {
      status: string;
      isOutstanding: boolean;
    } | null;
  } | undefined;

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
      <QueryErrorAlert
        error={error}
        subject='Chi tiết offboarding'
        onRetry={() => void refetch()}
      />
    );
  }

  if (!process) {
    return <div className='text-muted-foreground text-sm p-4'>Không tìm thấy quy trình</div>;
  }

  const isCompleted = process.status === 'completed';
  const canComplete = !isCompleted &&
    process.checklistItems?.every((i: ChecklistItem) => i.isCompleted || !i.mandatory) &&
    process.clearances?.every((c: ClearanceItem) => c.decision === 'approved');

  const canDecideClearance = (c: ClearanceItem) => !isCompleted && c.decision === 'pending';
  const canDoTask = (t: ChecklistItem) => !isCompleted && !t.isCompleted;
  const hasExitInterview = process.exitInterview?.scheduledAt;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-lg font-semibold'>Chi tiết Offboarding</h1>
          <p className='text-sm text-muted-foreground'>Mã số: {process.id.slice(0, 8)}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge status={process.status} mapping={OFFBOARDING_STATUS_MAP} />
        </div>
      </div>

      {/* Info */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Nhân viên</CardTitle></CardHeader>
          <CardContent><p className='font-mono text-xs'>{process.employeeId}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Ngày bắt đầu</CardTitle></CardHeader>
          <CardContent><p>{process.startDate}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className='text-sm'>Ngày kết thúc</CardTitle></CardHeader>
          <CardContent><p>{process.completedAt ?? process.targetEndDate ?? '—'}</p></CardContent>
        </Card>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader><CardTitle className='text-base'>Checklist</CardTitle></CardHeader>
        <CardContent>
          {process.checklistItems?.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có mục nào</p>
          ) : (
            <div className='space-y-2'>
              {(process.checklistItems ?? []).map((item) => (
                <div key={item.id} className='flex items-center justify-between rounded border p-3'>
                  <div className='flex items-center gap-2'>
                    <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                      {item.title}
                    </span>
                    {item.mandatory && <Badge variant='outline' className='text-xs'>Bắt buộc</Badge>}
                  </div>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={item.status} mapping={CHECKLIST_STATUS_MAP} />
                    {canDoTask(item) && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => completeItem.mutate({ processId, taskId: item.id })}
                        disabled={completeItem.isPending}
                      >
                        Hoàn tất
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clearances */}
      <Card>
        <CardHeader><CardTitle className='text-base'>Clearance từ phòng ban</CardTitle></CardHeader>
        <CardContent>
          {process.clearances?.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có clearance nào</p>
          ) : (
            <div className='space-y-2'>
              {(process.clearances ?? []).map((clearance) => (
                <div key={clearance.id} className='flex items-center justify-between rounded border p-3'>
                  <div>
                    <p className='text-sm font-medium'>{clearance.department}</p>
                    {clearance.note && (
                      <p className='text-xs text-muted-foreground'>{clearance.note}</p>
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={clearance.decision} mapping={CLEARANCE_STATUS_MAP} />
                    {canDecideClearance(clearance) && (
                      <div className='flex gap-1'>
                        <Button
                          size='sm'
                          variant='default'
                          onClick={() => decideClearance.mutate({ processId, department: clearance.department, decision: 'approved' })}
                          disabled={decideClearance.isPending}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() => decideClearance.mutate({ processId, department: clearance.department, decision: 'rejected' })}
                          disabled={decideClearance.isPending}
                        >
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Interview */}
      <Card>
        <CardHeader><CardTitle className='text-base'>Phỏng vấn thôi việc</CardTitle></CardHeader>
        <CardContent>
          {hasExitInterview ? (
            <div className='space-y-2'>
              <p className='text-sm'>
                Lịch hẹn: {process.exitInterview?.scheduledAt ?? '—'}
              </p>
              {process.exitInterview?.conductedAt ? (
                <p className='text-sm text-muted-foreground'>
                  Đã phỏng vấn lúc: {process.exitInterview.conductedAt}
                </p>
              ) : (
                <div className='flex gap-2'>
                  <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
                    <DialogTrigger asChild>
                      <Button size='sm' variant='outline'>Ghi nhận phỏng vấn</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Ghi nhận phỏng vấn</DialogTitle></DialogHeader>
                      <div className='grid gap-4 py-4'>
                        <div className='grid gap-2'>
                          <Label>Ghi chú</Label>
                          <Textarea
                            value={recordNote}
                            onChange={(e) => setRecordNote(e.target.value)}
                            placeholder='Kết quả phỏng vấn...'
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant='outline' onClick={() => setRecordOpen(false)}>Hủy</Button>
                        <Button
                          onClick={() => {
                            recordInterview.mutate({
                              processId,
                              notes: recordNote || undefined,
                            });
                            setRecordOpen(false);
                          }}
                          disabled={recordInterview.isPending}
                        >
                          Lưu
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          ) : (
            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogTrigger asChild>
                <Button size='sm'>Lên lịch phỏng vấn</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lên lịch phỏng vấn thôi việc</DialogTitle></DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='grid gap-2'>
                    <Label>Người phỏng vấn (User ID)</Label>
                    <Input
                      value={scheduleForm.interviewerUserId}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerUserId: e.target.value })}
                      placeholder='Nhập User ID...'
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label>Thời gian</Label>
                    <Input
                      type='datetime-local'
                      value={scheduleForm.scheduledAt}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant='outline' onClick={() => setScheduleOpen(false)}>Hủy</Button>
                  <Button
                    onClick={() => {
                      scheduleInterview.mutate({
                        processId,
                        employeeId: process.employeeId,
                        ...scheduleForm,
                      });
                      setScheduleOpen(false);
                    }}
                    disabled={scheduleInterview.isPending || !scheduleForm.scheduledAt}
                  >
                    Lưu
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Settlement info */}
      {process.settlement && (
        <Card>
          <CardHeader><CardTitle className='text-base'>Thanh toán cuối cùng</CardTitle></CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <StatusBadge
                status={process.settlement.isOutstanding ? 'outstanding' : 'settled'}
                mapping={{
                  outstanding: { label: 'Chưa thanh toán', variant: 'outline' },
                  settled: { label: 'Đã thanh toán', variant: 'default' },
                }}
              />
              <span className='text-sm text-muted-foreground'>
                Trạng thái: {process.settlement.status}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete button */}
      {canComplete && (
        <div className='flex justify-end'>
          <Button
            onClick={() => completeOffboarding.mutate(processId)}
            disabled={completeOffboarding.isPending}
          >
            {completeOffboarding.isPending ? 'Đang xử lý...' : 'Hoàn tất quy trình'}
          </Button>
        </div>
      )}
    </div>
  );
}
