'use client';

import * as React from 'react';
import { useApprovalInboxControllerList } from '@/api/generated/approval-inbox/approval-inbox';
import { extractList } from '@/lib/api-extract';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import {
  useApproveLeaveInboxRequest,
  useRejectLeaveInboxRequest,
} from '../api/mutations';
import { LeaveRequestDetailDialog, type LeaveRequestDetailItem } from './leave-request-detail-dialog';

interface InboxItem {
  approvalRequestId: string;
  leaveRequestId: string;
  status: string;
  requestedAt: string;
  requester?: {
    id: string;
    fullName: string;
    employeeCode: string;
    departmentName: string | null;
  } | null;
  leaveType?: {
    code: string;
    name: string;
    isPaid: boolean;
  } | null;
  startDate: string;
  endDate: string;
  totalUnits: string;
  reason?: string | null;
}

export function LeaveApprovalInboxSection() {
  const { data, isLoading } = useApprovalInboxControllerList();
  const rawItems = extractList<InboxItem>(data);

  const [selectedDetail, setSelectedDetail] = React.useState<LeaveRequestDetailItem | null>(null);

  const approveMutation = useApproveLeaveInboxRequest();
  const rejectMutation = useRejectLeaveInboxRequest();

  if (isLoading) {
    return null;
  }

  if (!rawItems.length) {
    return null;
  }

  return (
    <>
      <Card className='border-amber-500/30 bg-amber-500/5 shadow-xs'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-6 items-center justify-center rounded-full bg-amber-500 text-white'>
                <Icons.notification className='size-3.5' />
              </div>
              <CardTitle className='text-sm font-bold text-foreground'>
                Hộp thư phê duyệt: Cần bạn xử lý ({rawItems.length} đơn chờ duyệt)
              </CardTitle>
            </div>
            <span className='rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400'>
              Hành động ngay
            </span>
          </div>
        </CardHeader>
        <CardContent className='space-y-3 pt-0'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {rawItems.map((item) => {
              const reqName = item.requester?.fullName || 'Nhân viên';
              const typeName = item.leaveType?.name || 'Nghỉ phép';
              const dateRange = `${formatDateVN(item.startDate)} → ${formatDateVN(item.endDate)}`;
              const isMutating =
                approveMutation.isPending || rejectMutation.isPending;

              return (
                <div
                  key={item.approvalRequestId || item.leaveRequestId}
                  className='flex flex-col justify-between rounded-lg border border-border bg-card p-3 shadow-xs'
                >
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-xs text-foreground'>
                        {reqName}
                      </span>
                      <span className='text-[10px] text-muted-foreground'>
                        {item.requester?.employeeCode}
                      </span>
                    </div>

                    <p className='text-xs text-muted-foreground'>
                      <span className='font-medium text-foreground'>{typeName}</span>
                      {' • '}
                      <span>{item.totalUnits} ngày</span>
                    </p>

                    <p className='text-[11px] text-muted-foreground'>
                      {dateRange}
                    </p>

                    {item.reason && (
                      <p className='line-clamp-2 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground italic'>
                        &ldquo;{item.reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className='mt-3 flex items-center justify-between gap-1 border-t border-border/60 pt-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground'
                      onClick={() =>
                        setSelectedDetail({
                          id: item.leaveRequestId,
                          employeeName: reqName,
                          leaveTypeName: typeName,
                          startDate: item.startDate,
                          endDate: item.endDate,
                          totalUnits: item.totalUnits,
                          status: 'pending',
                          reason: item.reason,
                        })
                      }
                    >
                      <Icons.eye className='mr-1 size-3' />
                      Chi tiết
                    </Button>

                    <div className='flex items-center gap-1'>
                      <Button
                        variant='default'
                        size='sm'
                        className='h-7 bg-emerald-600 hover:bg-emerald-700 px-2.5 text-[11px] text-white'
                        disabled={isMutating}
                        onClick={() =>
                          approveMutation.mutate({
                            id: item.leaveRequestId,
                            data: { comment: 'Đã duyệt qua hộp thư nhanh' },
                          })
                        }
                      >
                        <Icons.check className='mr-1 size-3' />
                        Duyệt
                      </Button>
                      <Button
                        variant='destructive'
                        size='sm'
                        className='h-7 px-2 text-[11px]'
                        disabled={isMutating}
                        onClick={() =>
                          rejectMutation.mutate({
                            id: item.leaveRequestId,
                            data: { comment: 'Từ chối qua hộp thư nhanh' },
                          })
                        }
                      >
                        <Icons.close className='size-3' />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <LeaveRequestDetailDialog
        item={selectedDetail}
        open={Boolean(selectedDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetail(null);
        }}
      />
    </>
  );
}
