'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { commonUiCopy, scheduleUiCopy } from '@/lib/app-copy';
import { formatDateVN } from '@/lib/date';
import { useAllRequests, useApproveRequest, useDenyRequest } from '../api/request-queries';
import { GlobalWorkflowHero, type WorkflowStep } from '@/components/workflow/global-workflow-hero';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';

const TYPE_LABELS: Record<string, string> = {
  MORNING_OFF: scheduleUiCopy.requests.morningOff,
  AFTERNOON_OFF: scheduleUiCopy.requests.afternoonOff,
  FULL_DAY_OFF: scheduleUiCopy.requests.fullDayOff,
};

const STATUS_LABELS: Record<string, string> = {
  pending: scheduleUiCopy.requests.statusPending,
  approved: scheduleUiCopy.requests.statusApproved,
  denied: scheduleUiCopy.requests.statusDenied,
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  approved: 'default',
  denied: 'destructive',
};

const SCHEDULE_REQUEST_STEPS: WorkflowStep[] = [
  { key: 'pending', label: '1. Chờ thẩm định', description: 'Đề xuất đổi/nghỉ ca' },
  { key: 'approved', label: '2. Đã chấp thuận', description: 'Cập nhật bảng phân ca' },
];

export function ScheduleRequestsTable() {
  const [filterStatus, setFilterStatus] = React.useState('all');
  const requestsQuery = useAllRequests(filterStatus !== 'all' ? { status: filterStatus } : undefined);
  const approveMut = useApproveRequest();
  const denyMut = useDenyRequest();

  const requests = requestsQuery.data ?? [];
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const deniedCount = requests.filter((r) => r.status === 'denied').length;

  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const handleApprove = (id: string) => {
    approveMut.mutate(id, {
      onSuccess: () => {
        notifyMutationSuccess('Đã phê duyệt yêu cầu đổi/nghỉ ca và cập nhật lịch làm việc!');
      },
      onError: (err) => notifyMutationError(err, 'Lỗi phê duyệt yêu cầu.'),
    });
  };

  const handleDeny = (id: string) => {
    denyMut.mutate(id, {
      onSuccess: () => {
        notifyMutationSuccess('Đã từ chối yêu cầu đổi/nghỉ ca.');
      },
      onError: (err) => notifyMutationError(err, 'Lỗi từ chối yêu cầu.'),
    });
  };

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Workflow Metrics Banner */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Card className='border-l-4 border-l-slate-400'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-muted-foreground'>Tổng đề xuất</div>
            <div className='mt-1 text-2xl font-bold'>{requests.length}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-amber-700 dark:text-amber-400'>Chờ quản lý duyệt</div>
            <div className='mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200'>{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-emerald-700 dark:text-emerald-400'>Đã chấp thuận</div>
            <div className='mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200'>{approvedCount}</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-destructive bg-destructive/5'>
          <CardContent className='p-3.5'>
            <div className='text-xs font-medium text-destructive'>Bị từ chối</div>
            <div className='mt-1 text-2xl font-bold text-destructive'>{deniedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className='w-36'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tất cả</SelectItem>
              <SelectItem value='pending'>{scheduleUiCopy.requests.statusPending}</SelectItem>
              <SelectItem value='approved'>{scheduleUiCopy.requests.statusApproved}</SelectItem>
              <SelectItem value='denied'>{scheduleUiCopy.requests.statusDenied}</SelectItem>
            </SelectContent>
          </Select>
          {pendingCount > 0 && (
            <Badge variant='outline' className='text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300'>
              {pendingCount} chờ phê duyệt
            </Badge>
          )}
        </div>
        <div className='text-xs text-muted-foreground hidden sm:block'>
          Nhấp vào hàng để xem phân tích quy trình và phê duyệt với 1 cú nhấp chuột.
        </div>
      </div>

      {requestsQuery.isLoading ? (
        <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-pulse'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/20 hover:bg-transparent'>
                <TableHead><div className='h-4 w-20 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-32 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead className='w-32'><div className='h-4 w-12 rounded bg-muted' /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className='hover:bg-transparent'>
                  <TableCell><div className='h-4 w-28 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-20 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-24 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-3.5 w-40 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-5 w-16 rounded-full bg-muted' /></TableCell>
                  <TableCell><div className='h-8 w-24 rounded-md bg-muted' /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : requests.length === 0 ? (
        <div className='text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-sm'>
          <Icons.calendar className='h-8 w-8 text-muted-foreground/50' />
          <p>{scheduleUiCopy.requests.empty}</p>
        </div>
      ) : (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{scheduleUiCopy.requests.employeeColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.dateColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.typeColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.reasonColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.statusColumn}</TableHead>
                <TableHead>Bước tiếp theo & Người phụ trách</TableHead>
                <TableHead className='w-40 text-right'>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const isPending = r.status === 'pending';
                const isApproved = r.status === 'approved';

                let nextStepText = 'Đã hoàn tất';
                let nextStepClass = 'text-muted-foreground';

                if (isPending) {
                  nextStepText = 'Quản lý ca thẩm định';
                  nextStepClass = 'text-amber-600 dark:text-amber-400 font-medium';
                } else if (isApproved) {
                  nextStepText = 'Tự động cập nhật bảng ca';
                  nextStepClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
                } else {
                  nextStepText = 'Đã từ chối (giữ nguyên ca)';
                  nextStepClass = 'text-destructive';
                }

                return (
                  <TableRow
                    key={r.id}
                    className='cursor-pointer hover:bg-muted/40 transition-colors'
                    onClick={() => setSelectedRequestId(r.id)}
                  >
                    <TableCell className='font-medium'>
                      <div>{r.employeeName}</div>
                      <div className='text-[11px] text-muted-foreground font-mono'>
                        #{r.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateVN(r.date)}</TableCell>
                    <TableCell>
                      <Badge variant='secondary' className='text-xs'>
                        {TYPE_LABELS[r.requestType] ?? r.requestType}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-xs max-w-[200px] truncate'>
                      {r.reason ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? 'outline'}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${nextStepClass}`}>
                        {nextStepText}
                      </span>
                    </TableCell>
                    <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center justify-end gap-1'>
                        {isPending ? (
                          <>
                            <Button
                              size='sm'
                              variant='default'
                              className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                              onClick={() => handleApprove(r.id)}
                              disabled={approveMut.isPending}
                            >
                              {approveMut.isPending ? (
                                <Icons.spinner className='size-3.5 animate-spin mr-1' />
                              ) : (
                                <Icons.check className='size-3.5 mr-1' />
                              )}
                              Duyệt
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 text-xs text-destructive hover:bg-destructive/10'
                              onClick={() => handleDeny(r.id)}
                              disabled={denyMut.isPending}
                            >
                              <Icons.circleX className='size-3.5 mr-1' />
                              Từ chối
                            </Button>
                          </>
                        ) : (
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 text-xs'
                            onClick={() => setSelectedRequestId(r.id)}
                          >
                            <Icons.eye className='size-3.5 mr-1' />
                            Chi tiết
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detailed Workflow Inspection Dialog */}
      <Dialog
        open={!!selectedRequestId}
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Icons.calendar className='size-5 text-primary' />
              <span>Yêu cầu thay đổi ca làm việc #{selectedRequestId?.slice(0, 8)}</span>
            </DialogTitle>
            <DialogDescription>
              Quy trình nhân viên đề xuất thay đổi lịch trình và quản lý phê duyệt cập nhật bảng phân ca.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className='space-y-4'>
              <GlobalWorkflowHero
                title={`Yêu cầu đổi ca · ${selectedRequest.employeeName}`}
                badge={
                  <Badge variant={STATUS_VARIANTS[selectedRequest.status] ?? 'outline'}>
                    {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                  </Badge>
                }
                subtitle={`Ngày áp dụng: ${formatDateVN(selectedRequest.date)} · ${TYPE_LABELS[selectedRequest.requestType] ?? selectedRequest.requestType}`}
                steps={SCHEDULE_REQUEST_STEPS}
                currentStepIndex={selectedRequest.status === 'pending' ? 0 : 1}
                failedStepIndex={selectedRequest.status === 'denied' ? 1 : undefined}
                nextActor={
                  selectedRequest.status === 'pending'
                    ? 'Quản lý ca / Phụ trách Xếp lịch'
                    : 'Đã hoàn tất quy trình'
                }
                actionGuidance={
                  selectedRequest.status === 'pending'
                    ? 'Rà soát độ phủ nhân sự trong ca làm việc và ra quyết định Chấp thuận hoặc Từ chối.'
                    : selectedRequest.status === 'approved'
                    ? 'Yêu cầu đã được phê duyệt. Phân ca mới đã được áp dụng vào hệ thống.'
                    : 'Yêu cầu bị từ chối. Nhân viên tiếp tục làm việc theo lịch trình hiện tại.'
                }
                actionResultPreview={
                  selectedRequest.status === 'pending'
                    ? 'Nếu chấp thuận: Hệ thống tự động ghi đè hoặc hủy phân ca của nhân viên trong ngày này.'
                    : undefined
                }
                actions={
                  selectedRequest.status === 'pending' ? (
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        className='bg-emerald-600 hover:bg-emerald-700 text-white'
                        onClick={() => {
                          handleApprove(selectedRequest.id);
                          setSelectedRequestId(null);
                        }}
                        disabled={approveMut.isPending}
                      >
                        {approveMut.isPending && (
                          <Icons.spinner className='size-3.5 animate-spin mr-1.5' />
                        )}
                        <Icons.check className='size-3.5 mr-1.5' />
                        Chấp thuận yêu cầu
                      </Button>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() => {
                          handleDeny(selectedRequest.id);
                          setSelectedRequestId(null);
                        }}
                        disabled={denyMut.isPending}
                      >
                        <Icons.circleX className='size-3.5 mr-1.5' />
                        Từ chối yêu cầu
                      </Button>
                    </div>
                  ) : undefined
                }
              />

              <div className='rounded-lg border bg-muted/20 p-4 space-y-2 text-xs'>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <span className='text-muted-foreground'>Nhân viên: </span>
                    <span className='font-medium'>{selectedRequest.employeeName}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Loại thay đổi: </span>
                    <span className='font-medium'>{TYPE_LABELS[selectedRequest.requestType] ?? selectedRequest.requestType}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Ngày áp dụng: </span>
                    <span className='font-medium'>{formatDateVN(selectedRequest.date)}</span>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Trạng thái: </span>
                    <span className='font-medium'>{STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}</span>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className='pt-2 border-t'>
                    <span className='text-muted-foreground'>Lý do: </span>
                    <span className='font-medium'>{selectedRequest.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSelectedRequestId(null)}
            >
              {commonUiCopy.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
