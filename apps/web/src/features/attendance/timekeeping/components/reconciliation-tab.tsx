'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import {
  useReconciliationListQuery,
  useReconciliationMismatchesQuery,
  useRunReconciliationMutation,
  type ReconciliationDiffType,
} from '../../api/period-lock-api';

const DIFF_TYPE_LABELS: Record<ReconciliationDiffType, string> = {
  MATCH: 'Khớp dữ liệu',
  MISSING_ATTENDANCE_SNAPSHOT: 'Thiếu dữ liệu chốt công',
  MISSING_PAYROLL_INPUT: 'Chưa có dữ liệu bảng lương',
  REGULAR_HOURS_MISMATCH: 'Lệch giờ công chuẩn',
  OVERTIME_MISMATCH: 'Lệch giờ tăng ca (OT)',
  EMPLOYEE_NOT_FOUND: 'Không tìm thấy nhân sự',
  DUPLICATE_RECORD: 'Trùng lặp bản ghi',
};

interface ReconciliationTabProps {
  period: string;
}

export function ReconciliationTab({ period }: ReconciliationTabProps) {
  const { data: runs = [], isLoading } = useReconciliationListQuery(period);
  const runMutation = useRunReconciliationMutation();
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);

  const activeRunId = selectedRunId ?? runs[0]?.id ?? null;
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;

  const { data: mismatches = [], isLoading: loadingMismatches } =
    useReconciliationMismatchesQuery(activeRunId);

  const handleRunReconciliation = () => {
    runMutation.mutate(
      { period },
      {
        onSuccess: (summary) => {
          if (summary?.id) {
            setSelectedRunId(summary.id);
          }
        },
      },
    );
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <div>
            <CardTitle className='text-base'>Đối soát dữ liệu Chấm công & Bảng lương ({period})</CardTitle>
            <CardDescription>
              So sánh bảng công đã khóa/chốt với dữ liệu đầu vào bảng lương để phát hiện chênh lệch giờ công hoặc OT.
            </CardDescription>
          </div>
          <Button
            size='sm'
            disabled={runMutation.isPending}
            onClick={handleRunReconciliation}
          >
            {runMutation.isPending ? (
              <Icons.spinner className='mr-1.5 size-4 animate-spin' />
            ) : (
              <Icons.refresh className='mr-1.5 size-4' />
            )}
            Chạy đối soát kỳ {period}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>Đang tải lịch sử đối soát...</p>
          ) : runs.length === 0 ? (
            <p className='text-sm text-muted-foreground py-6 text-center'>
              Chưa có phiên đối soát nào cho kỳ công {period}. Nhấn &ldquo;Chạy đối soát&rdquo; để kiểm tra.
            </p>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời điểm kiểm tra</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className='text-right'>Tổng nhân sự</TableHead>
                    <TableHead className='text-right'>Khớp hoàn toàn</TableHead>
                    <TableHead className='text-right'>Lệch dữ liệu</TableHead>
                    <TableHead className='text-right'>Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const isSelected = run.id === activeRunId;
                    return (
                      <TableRow
                        key={run.id}
                        className={isSelected ? 'bg-muted/40' : undefined}
                      >
                        <TableCell className='text-xs font-medium'>
                          {run.checkedAt ? formatDateVN(run.checkedAt) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              run.status === 'completed'
                                ? 'default'
                                : run.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {run.status === 'completed'
                              ? 'Hoàn tất'
                              : run.status === 'failed'
                                ? 'Lỗi'
                                : 'Đang xử lý'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs'>
                          {run.totalEmployees}
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs text-emerald-600'>
                          {run.matchedCount}
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs text-amber-600 font-semibold'>
                          {run.mismatchCount}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            size='sm'
                            variant={isSelected ? 'secondary' : 'ghost'}
                            className='h-7 text-xs'
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            Xem sai lệch
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {activeRun && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-semibold'>
              Chi tiết sai lệch công - lương ({mismatches.length} bản ghi không khớp)
            </CardTitle>
            <CardDescription className='text-xs'>
              Phiên kiểm tra lúc {activeRun.checkedAt ? formatDateVN(activeRun.checkedAt) : '—'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMismatches ? (
              <p className='text-xs text-muted-foreground py-4 text-center'>Đang tải chi tiết sai lệch...</p>
            ) : mismatches.length === 0 ? (
              <div className='flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 py-6 text-xs text-emerald-700 dark:text-emerald-300'>
                <Icons.check className='size-4' />
                <span>Tất cả bản ghi công và lương trong phiên này đều khớp 100%.</span>
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhân sự (ID)</TableHead>
                      <TableHead className='text-right'>Giờ chuẩn (Công)</TableHead>
                      <TableHead className='text-right'>Giờ chuẩn (Lương)</TableHead>
                      <TableHead className='text-right'>Giờ OT (Công)</TableHead>
                      <TableHead className='text-right'>Giờ OT (Lương)</TableHead>
                      <TableHead>Loại chênh lệch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mismatches.map((item) => (
                      <TableRow key={item.id || `${item.employeeId}-${item.diffType}`}>
                        <TableCell className='font-mono text-xs'>{item.employeeId}</TableCell>
                        <TableCell className='text-right font-mono text-xs'>
                          {item.attendanceRegularHours}h
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs'>
                          {item.payrollRegularHours}h
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs'>
                          {item.attendanceOvertimeHours}h
                        </TableCell>
                        <TableCell className='text-right font-mono text-xs'>
                          {item.payrollOvertimeHours}h
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className='border-amber-500/50 text-amber-700 dark:text-amber-300 text-[11px]'>
                            {DIFF_TYPE_LABELS[item.diffType] ?? item.diffType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
