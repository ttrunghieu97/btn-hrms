'use client';

import * as React from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTimesheet } from './hooks/use-timesheet';
import { usePeriodLock } from './hooks/use-period-lock';
import { DetailSheet } from './components/detail-sheet';
import { daysInMonth, type TimesheetWorkspaceRecord, type TimesheetWorkspaceEmployee } from './types';
import { getRecord } from './utils';
import { timekeepingControllerOverrideAttendanceSummary } from '@/api/generated/attendance-timekeeping/attendance-timekeeping';
import type { OverrideAttendanceSummaryDto, OverrideAttendanceSummaryDtoReason, OverrideAttendanceSummaryDtoOverriddenStatus } from '@/api/generated/model';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Period navigation helper ──────────────────────────────────────────

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y!, m! - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Audited Adjustment / Manual Entry Dialog ──────────────────────────

interface AdjustmentModalProps {
  employeeName: string;
  workDate: string;
  isNewEntry: boolean;
  currentRecord?: TimesheetWorkspaceRecord;
  onClose: () => void;
  onConfirm: (payload: {
    reason: string;
    note?: string;
    overriddenStatus?: string;
    overriddenWorkedMinutes?: number;
  }) => Promise<void>;
}

function AdjustmentModal({ employeeName, workDate, isNewEntry, currentRecord, onClose, onConfirm }: AdjustmentModalProps) {
  const [reason, setReason] = React.useState('manual_correction');
  const [note, setNote] = React.useState('');
  const [overriddenStatus, setOverriddenStatus] = React.useState(currentRecord?.status ?? 'present');
  const [workedHours, setWorkedHours] = React.useState(
    currentRecord?.workedMinutes ? String(Math.round((currentRecord.workedMinutes / 60) * 10) / 10) : '8',
  );
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === 'other' && !note.trim()) {
      showToast.error('Vui lòng nhập ghi chú chi tiết khi chọn lý do "Khác"');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        reason,
        note: note.trim() || undefined,
        overriddenStatus,
        overriddenWorkedMinutes: Math.round(Number(workedHours) * 60),
      });
      onClose();
    } catch {
      /* Handled by caller */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isNewEntry ? 'Chấm công thủ công' : 'Điều chỉnh giờ công'} — {employeeName}</DialogTitle>
          <DialogDescription>
            Ngày: <span className="text-foreground font-mono font-semibold">{workDate}</span> · Mọi thay đổi đều được ghi lại lý do cho đối soát.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="adj-status">Loại công / Trạng thái</Label>
            <Select value={overriddenStatus} onValueChange={setOverriddenStatus}>
              <SelectTrigger id="adj-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Công thường (Có mặt)</SelectItem>
                <SelectItem value="late">Đi muộn</SelectItem>
                <SelectItem value="early_leave">Về sớm</SelectItem>
                <SelectItem value="leave">Nghỉ phép</SelectItem>
                <SelectItem value="holiday">Nghỉ lễ</SelectItem>
                <SelectItem value="absent">Vắng mặt (Không công)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="adj-hours">Số công / Tổng giờ (giờ)</Label>
            <Input
              id="adj-hours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={workedHours}
              onChange={(e) => setWorkedHours(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="adj-reason">Lý do (Bắt buộc audit)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="adj-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_correction">HR nhập thủ công / Quên quẹt thẻ</SelectItem>
                <SelectItem value="policy_exception">Ngoại lệ chính sách / Công tác</SelectItem>
                <SelectItem value="data_fix">Sửa lỗi thiết bị chấm công</SelectItem>
                <SelectItem value="reconciliation">Đối soát dữ liệu kỳ công</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="adj-note">Ghi chú chi tiết</Label>
            <Textarea
              id="adj-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú chi tiết…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" isLoading={submitting}>
              {submitting ? 'Đang lưu…' : 'Lưu công'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Close Period Confirmation Dialog ──────────────────────────────────

function CloseModal({ period, missingCount, onClose, onConfirm }: { period: string; missingCount: number; onClose: () => void; onConfirm: (remarks: string) => void }) {
  const [r, setR] = React.useState('');
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Đóng / Chốt bảng công tháng {period}</AlertDialogTitle>
          <AlertDialogDescription>
            {missingCount > 0 ? (
              <span className="text-amber-700 dark:text-amber-400">
                Hiện còn <strong className="underline">{missingCount} nhân sự</strong> chưa chốt công cá nhân. Việc đóng kỳ sẽ lưu snapshot hiện tại cho phân hệ Payroll.
              </span>
            ) : (
              'Tất cả nhân sự trong kỳ đã được chốt công. Hệ thống sẽ đóng kỳ và chuyển dữ liệu sang phân hệ Payroll.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={r}
          onChange={(e) => setR(e.target.value)}
          placeholder="Ghi chú đóng kỳ công (Không bắt buộc)"
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(r)}>Xác nhận Đóng kỳ công</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReopenModal({
  period,
  onClose,
  onConfirm,
}: {
  period: string;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [r, setR] = React.useState('');
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mở lại kỳ công tháng {period}</AlertDialogTitle>
          <AlertDialogDescription>
            Hệ thống sẽ chuyển trạng thái kỳ công về Đang mở để cho phép HR chỉnh sửa, điều chỉnh dữ liệu chấm công. Thao tác này sẽ được ghi nhận vào nhật ký kiểm toán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={r}
          onChange={(e) => setR(e.target.value)}
          placeholder="Lý do mở lại kỳ công (Không bắt buộc)"
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(r)}>Xác nhận Mở lại kỳ công</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Monthly Attendance Page ──────────────────────────────────────

export function TimesheetEditorPage({ defaultPeriod }: { defaultPeriod?: string }) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routePeriod = typeof params?.period === 'string' ? params.period : undefined;
  const activePeriod = routePeriod ?? defaultPeriod;

  const ts = useTimesheet(activePeriod);
  const pl = usePeriodLock();

  const navigatePeriod = React.useCallback(
    (delta: number) => {
      const nextPeriod = shiftPeriod(ts.period, delta);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      router.push(`/attendance/management/periods/${nextPeriod}${query}`);
    },
    [router, searchParams, ts.period],
  );

  const [adjustingDate, setAdjustingDate] = React.useState<string | null>(null);
  const [adjustingEmployee, setAdjustingEmployee] = React.useState<TimesheetWorkspaceEmployee | null>(null);
  const [showClose, setShowClose] = React.useState(false);
  const [showReopen, setShowReopen] = React.useState(false);

  const canEdit = ts.periodStatus === 'open';
  const days = daysInMonth(ts.period);

  // Count of employees not yet individually verified (chưa chốt cá nhân)
  const missingCount = React.useMemo(
    () => ts.employees.filter((e) => e.verificationStatus !== 'done').length,
    [ts.employees],
  );

  const handleLock = React.useCallback(async (remarks: string) => {
    const ok = await pl.lock(ts.period, remarks);
    if (ok) ts.reload();
    setShowClose(false);
  }, [pl, ts]);

  const handleReopen = React.useCallback(async (remarks: string) => {
    const ok = await pl.reopen(ts.period, remarks || 'HR mở lại kỳ công');
    if (ok) ts.reload();
    setShowReopen(false);
  }, [pl, ts]);

  const handleOverrideSubmit = async (payload: {
    reason: string;
    note?: string;
    overriddenStatus?: string;
    overriddenWorkedMinutes?: number;
  }) => {
    if (!adjustingEmployee || !adjustingDate) return;
    try {
      await timekeepingControllerOverrideAttendanceSummary({
        employeeId: adjustingEmployee.id,
        workDate: adjustingDate,
        reason: payload.reason as OverrideAttendanceSummaryDtoReason,
        note: payload.note,
        overriddenStatus: payload.overriddenStatus as OverrideAttendanceSummaryDtoOverriddenStatus,
        overriddenWorkedMinutes: payload.overriddenWorkedMinutes,
      });

      showToast.success('Đã lưu công thành công');
      await ts.reload();
    } catch (err: any) {
      showToast.error(err?.message ?? 'Lưu công thất bại');
      throw new Error('Override failed');
    }
  };

  const onAdjust = React.useCallback((emp: TimesheetWorkspaceEmployee, workDate: string) => {
    if (!canEdit) return;
    setAdjustingEmployee(emp);
    setAdjustingDate(workDate);
  }, [canEdit]);

  if (ts.loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Spinner />
        <span className="text-muted-foreground text-sm">Đang tải bảng công tháng…</span>
      </div>
    );
  }

  if (ts.error) {
    return (
      <div className="bg-card border-border rounded-xl border p-6 text-center">
        <p className="text-destructive text-sm">{ts.error}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={ts.reload}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col h-full">
      {/* ── Split workspace ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailSheet
          period={ts.period}
          employees={ts.employees}
          records={ts.records}
          canEdit={canEdit}
          onAdjust={onAdjust}
          onReload={ts.reload}
          navigatePeriod={navigatePeriod}
          onClosePeriod={() => setShowClose(true)}
          onReopenPeriod={() => setShowReopen(true)}
          periodStatus={ts.periodStatus}
        />
      </div>

      {/* ── Dialogs ── */}
      {showClose && <CloseModal period={ts.period} missingCount={missingCount} onClose={() => setShowClose(false)} onConfirm={handleLock} />}
      {showReopen && <ReopenModal period={ts.period} onClose={() => setShowReopen(false)} onConfirm={handleReopen} />}
      {adjustingDate && adjustingEmployee && (
        <AdjustmentModal
          employeeName={adjustingEmployee.fullName}
          workDate={adjustingDate}
          isNewEntry={!getRecord(ts.records, adjustingEmployee.id, adjustingDate)}
          currentRecord={getRecord(ts.records, adjustingEmployee.id, adjustingDate)}
          onClose={() => setAdjustingDate(null)}
          onConfirm={handleOverrideSubmit}
        />
      )}
    </div>
  );
}
