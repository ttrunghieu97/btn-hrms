'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { formatDateVN } from '@/lib/date';
import { useEmployeeStatusHistoryQuery } from '../../queries/employee-queries';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeLifecycleHistoryCardProps {
  employeeId: string;
}

function formatDateTime(iso: string | Date | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = formatDateVN(d);
  return `${time} · ${date}`;
}

export function EmployeeLifecycleHistoryCard({ employeeId }: EmployeeLifecycleHistoryCardProps) {
  const { data: history = [], isLoading, error } = useEmployeeStatusHistoryQuery(employeeId);

  return (
    <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-all duration-300'>
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-amber-500/10 p-1.5 rounded-lg text-amber-600'>
            <Icons.refresh className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-foreground/90'>
              Nhật ký vòng đời & Chuyển đổi trạng thái
            </h3>
            <p className='text-muted-foreground text-xs'>
              Lịch sử ghi nhận các quyết định thử việc, chính thức, tạm hoãn và thôi việc
            </p>
          </div>
        </div>
        <span className='rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
          {history.length} sự kiện
        </span>
      </div>

      <div className='p-4'>
        {isLoading && (
          <div className='space-y-3 py-2'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        )}

        {Boolean(error) && (
          <p className='py-4 text-center text-xs text-destructive'>
            Không thể tải lịch sử chuyển đổi trạng thái
          </p>
        )}


        {!isLoading && !error && history.length === 0 && (
          <div className='flex flex-col items-center justify-center py-6 text-center'>
            <div className='rounded-full bg-muted/60 p-2 text-muted-foreground mb-2'>
              <Icons.calendar className='size-5' />
            </div>
            <p className='text-sm font-medium text-foreground/80'>Chưa có thay đổi trạng thái</p>
            <p className='text-xs text-muted-foreground mt-0.5 max-w-sm'>
              Hồ sơ đang ở trạng thái tiếp nhận ban đầu. Mọi quyết định thay đổi trạng thái sẽ được
              ghi nhận tự động tại đây.
            </p>
          </div>
        )}

        {!isLoading && !error && history.length > 0 && (
          <div className='relative pl-6 space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-border/70'>
            {history.map((item, index) => {
              const isLatest = index === 0;
              return (
                <div key={item.id} className='relative flex items-start gap-3.5 group'>
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 mt-1 flex size-5 items-center justify-center rounded-full border-2 bg-background ${
                      isLatest
                        ? 'border-amber-500 text-amber-500'
                        : 'border-muted-foreground/40 text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`size-2 rounded-full ${
                        isLatest ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/50'
                      }`}
                    />
                  </div>

                  <div className='min-w-0 flex-1 rounded-lg border bg-background/50 p-3 hover:bg-muted/30 transition-colors'>
                    <div className='flex flex-wrap items-center justify-between gap-2 mb-1.5'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-semibold text-foreground'>
                          Chuyển sang trạng thái:
                        </span>
                        <EmployeeStatusBadge status={item.status} />
                      </div>
                      <span className='text-[11px] font-medium text-muted-foreground'>
                        {formatDateTime(item.changedAt)}
                      </span>
                    </div>

                    {item.notes ? (
                      <p className='text-xs text-foreground/90 bg-muted/40 rounded px-2.5 py-1.5 border border-border/40'>
                        <span className='font-medium text-muted-foreground'>Căn cứ / Lý do: </span>
                        {item.notes}
                      </p>
                    ) : (
                      <p className='text-[11px] italic text-muted-foreground'>
                        Không kèm ghi chú quyết định
                      </p>
                    )}

                    {item.changedByName && (
                      <p className='mt-1 text-[11px] text-muted-foreground'>
                        Người thực hiện: <span className='font-medium text-foreground'>{item.changedByName}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
