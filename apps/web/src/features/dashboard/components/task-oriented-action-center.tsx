'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/stores/auth-store';
import { usePayrollRunsQuery } from '@/features/payroll';
import { UnifiedTaskInbox } from '@/components/workflow/unified-task-inbox';

export function TaskOrientedActionCenter() {
  const user = useAuthStore((s) => s.user);

  // 1. Active Payroll Runs for tracking
  const { data: payrollData } = usePayrollRunsQuery({ limit: 3 });
  const payrollRuns = payrollData?.rows ?? [];
  const activePayrollRun = payrollRuns.find((r) => r.status === 'draft' || r.status === 'processing' || r.status === 'approved');

  return (
    <div className='space-y-5'>
      {/* Welcome & Persona Context Banner */}
      <div className='flex flex-col gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5 md:flex-row md:items-center md:justify-between shadow-xs'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <h2 className='text-lg font-bold tracking-tight text-foreground'>
              Xin chào, {user?.username || 'Bạn'}
            </h2>
            <Badge variant='outline' className='text-[11px] bg-background font-semibold'>
              Work Operating System (HRMS Hub)
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground'>
            Trung tâm kiểm soát và điều phối toàn bộ 12 quy trình nghiệp vụ HRMS.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className='flex flex-wrap items-center gap-2'>
          <Button size='sm' variant='default' asChild className='h-8 text-xs font-medium gap-1.5 shadow-xs'>
            <Link href='/leave'>
              <Icons.calendar className='size-3.5' />
              Tạo đơn xin nghỉ
            </Link>
          </Button>
          <Button size='sm' variant='outline' asChild className='h-8 text-xs font-medium gap-1.5 bg-background'>
            <Link href='/expenses'>
              <Icons.billing className='size-3.5 text-primary' />
              Kê khai chi phí
            </Link>
          </Button>
          <Button size='sm' variant='outline' asChild className='h-8 text-xs font-medium gap-1.5 bg-background'>
            <Link href='/asset-management/requests'>
              <Icons.laptop className='size-3.5 text-primary' />
              Yêu cầu thiết bị
            </Link>
          </Button>
          <Button size='sm' variant='outline' asChild className='h-8 text-xs font-medium gap-1.5 bg-background'>
            <Link href='/attendance'>
              <Icons.activity className='size-3.5 text-primary' />
              Chấm công & Đi ca
            </Link>
          </Button>
          <Button size='sm' variant='outline' asChild className='h-8 text-xs font-medium gap-1.5 bg-background'>
            <Link href='/employees/new'>
              <Icons.add className='size-3.5' />
              Tiếp nhận nhân sự
            </Link>
          </Button>
        </div>
      </div>

      {/* PLATFORM UNIFIED TASK INBOX */}
      <UnifiedTaskInbox />

      {/* Workflow Tracking & Quick Domain Access */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Box: ĐANG CHỜ NGƯỜI KHÁC (WAITING FOR OTHERS) */}
        <Card className='border-blue-500/30 bg-card shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-6 items-center justify-center rounded-full bg-blue-600 text-white'>
                <Icons.activity className='size-3.5' />
              </div>
              <CardTitle className='text-sm font-bold text-foreground'>
                Đang chờ người khác (Waiting For Others)
              </CardTitle>
            </div>
            <Badge variant='outline' className='border-blue-500/30 text-blue-600 text-[10px]'>
              Theo dõi luồng
            </Badge>
          </CardHeader>
          <CardContent className='space-y-2.5 pt-2 text-xs flex-1'>
            <div className='rounded-lg border border-border bg-muted/20 p-3 space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='font-medium text-foreground'>Đơn nghỉ phép cá nhân</span>
                <span className='rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-700 dark:text-blue-400 text-[10px] font-semibold'>
                  Chờ quản lý thẩm định
                </span>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Hệ thống đang chờ người quản lý trực tiếp xác nhận số dư và phê duyệt đơn của bạn.
              </p>
              <Button variant='ghost' size='sm' asChild className='h-6 text-[10px] px-0 text-primary'>
                <Link href='/leave'>Kiểm tra tiến trình đơn →</Link>
              </Button>
            </div>

            {activePayrollRun && (
              <div className='rounded-lg border border-border bg-muted/20 p-3 space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-foreground'>Bảng lương {activePayrollRun.payrollPeriod?.name || ''}</span>
                  <Badge variant='outline' className='text-[10px] uppercase font-bold'>{activePayrollRun.status}</Badge>
                </div>
                <p className='text-[11px] text-muted-foreground'>
                  {activePayrollRun.status === 'draft'
                    ? 'Đang ở trạng thái Bản nháp, cần tính toán phiếu lương.'
                    : activePayrollRun.status === 'processing'
                      ? 'Đang chờ Ban Giám đốc / Kế toán trưởng phê duyệt.'
                      : 'Đã phê duyệt, chờ xuất lương.'}
                </p>
                <Button variant='ghost' size='sm' asChild className='h-6 text-[10px] px-0 text-primary'>
                  <Link href={`/payroll/runs/${activePayrollRun.id}`}>Mở quy trình bảng lương →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Box: QUY TRÌNH NỀN TẢNG (CORE ENTERPRISE WORKFLOWS) */}
        <Card className='border-border/80 bg-card shadow-xs flex flex-col justify-between'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                <Icons.dashboard className='size-3.5' />
              </div>
              <CardTitle className='text-sm font-bold text-foreground'>
                Các luồng nghiệp vụ lõi (12 Workflows)
              </CardTitle>
            </div>
            <span className='text-[10px] text-muted-foreground'>P0 / P1 / P2</span>
          </CardHeader>
          <CardContent className='space-y-2 pt-2 text-xs flex-1'>
            <Link
              href='/employees'
              className='flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50 hover:border-primary/40'
            >
              <div>
                <div className='font-semibold text-foreground'>Vòng đời nhân sự & Hợp đồng</div>
                <div className='text-muted-foreground text-[11px]'>Thử việc → Chính thức → Điều chuyển → Chấm dứt</div>
              </div>
              <Icons.chevronRight className='size-3.5 text-muted-foreground' />
            </Link>

            <Link
              href='/attendance'
              className='flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50 hover:border-primary/40'
            >
              <div>
                <div className='font-semibold text-foreground'>Chấm công & Khóa kỳ lương</div>
                <div className='text-muted-foreground text-[11px]'>Chấm công → Ngoại lệ → Khóa kỳ → Chốt số liệu</div>
              </div>
              <Icons.chevronRight className='size-3.5 text-muted-foreground' />
            </Link>

            <Link
              href='/asset-management/requests'
              className='flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50 hover:border-primary/40'
            >
              <div>
                <div className='font-semibold text-foreground'>Cấp phát thiết bị & Bàn giao</div>
                <div className='text-muted-foreground text-[11px]'>Yêu cầu → Duyệt → Xuất kho Serial → Thu hồi</div>
              </div>
              <Icons.chevronRight className='size-3.5 text-muted-foreground' />
            </Link>

            <Link
              href='/onboarding'
              className='flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50 hover:border-primary/40'
            >
              <div>
                <div className='font-semibold text-foreground'>Tiếp nhận Onboarding & Thôi việc Offboarding</div>
                <div className='text-muted-foreground text-[11px]'>Checklist nhiệm vụ → Bàn giao → Phê duyệt phòng ban</div>
              </div>
              <Icons.chevronRight className='size-3.5 text-muted-foreground' />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
