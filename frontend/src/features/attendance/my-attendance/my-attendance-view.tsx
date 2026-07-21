'use client';

import * as React from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AttendanceHomeScreen } from '../screens/AttendanceHomeScreen';
import { CameraCaptureDialog, type AttendanceImageSource } from '../components/camera-capture-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/layout/section';
import type { AttendanceCommandControllerCheckAttendanceFromWebBodyImageSource } from '@/api/generated/model';
import {
  useMyMonthAttendanceQuery,
  useCheckAttendanceMutation,
  attendanceInvalidations
} from '../queries/attendance-queries';
import { currentMonthString } from '../utils/attendance-utils';

export function MyAttendanceView() {
  const [params] = useQueryStates({
    month: parseAsString.withDefault(currentMonthString())
  });

  const activeMonth = params.month;
  const queryParams = React.useMemo(
    () => ({ month: activeMonth, limit: 500 }),
    [activeMonth]
  );

  const queryClient = useQueryClient();
  const checkMutation = useCheckAttendanceMutation(queryClient);

  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [lunchDutyType, setLunchDutyType] = React.useState<'indoor' | 'outdoor' | null>(null);
  const [isLunchDutyModalOpen, setIsLunchDutyModalOpen] = React.useState(false);

  const [punchParams, setPunchParams] = React.useState<{
    date: string;
    session: 'morning' | 'noon' | 'afternoon';
    type: 'checkin' | 'checkout';
  } | null>(null);

  const handlePunch = React.useCallback((
    date: string,
    session: 'morning' | 'noon' | 'afternoon',
    action: 'checkin' | 'checkout'
  ) => {
    setPunchParams({ date, session, type: action });
    if (session === 'noon' && action === 'checkin') {
      setLunchDutyType(null);
      setIsLunchDutyModalOpen(true);
    } else {
      setIsCameraOpen(true);
    }
  }, []);

  const handleCapture = React.useCallback(async (file: File, imageSource: AttendanceImageSource) => {
    if (!punchParams) return;
    try {
      const { date, session, type } = punchParams;
      const lunchDuty = session === 'noon' && type === 'checkin' && lunchDutyType ? lunchDutyType : undefined;

      await checkMutation.mutateAsync({
        body: {
          date,
          session,
          type,
          imageSource: imageSource as AttendanceCommandControllerCheckAttendanceFromWebBodyImageSource,
          image: file,
          lunchDutyType: lunchDuty,
        } as any,
        monthParams: undefined,
      });

      toast.success(type === 'checkin' ? attendanceUiCopy.checkinToast.successIn : attendanceUiCopy.checkinToast.successOut);
      setIsCameraOpen(false);
      
      await attendanceInvalidations.myMonth(queryClient, queryParams);
      await attendanceInvalidations.todayAttendance(queryClient);
    } catch (error: any) {
      toast.error(error?.message ?? attendanceUiCopy.checkinToast.error);
    }
    await attendanceInvalidations.myMonth(queryClient, queryParams).catch(() => {});
    await attendanceInvalidations.todayAttendance(queryClient).catch(() => {});
  }, [punchParams, lunchDutyType, queryClient, queryParams, checkMutation]);

  return (
    <>
      <Section>
        <AttendanceHomeScreen onPunch={handlePunch} />
      </Section>
      <CameraCaptureDialog
        open={isCameraOpen}
        onOpenChange={setIsCameraOpen}
        onCapture={handleCapture}
      />
      <Dialog open={isLunchDutyModalOpen} onOpenChange={setIsLunchDutyModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-lg shadow-xl backdrop-blur-md">
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>{employeeUiCopy.attendance.presence.selectLunchDutyTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-1">
            {employeeUiCopy.attendance.presence.selectLunchDutyDesc}
          </DialogDescription>

          <div className="grid grid-cols-1 gap-4 mt-6" role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={lunchDutyType === 'indoor'}
              onClick={() => setLunchDutyType('indoor')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-350 ${
                lunchDutyType === 'indoor'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-lg">
                🏢
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">{employeeUiCopy.attendance.presence.trucTruaTrongNhaTitle}</p>
                <p className="text-xs text-slate-400 leading-normal">
                  {employeeUiCopy.attendance.presence.trucTruaTrongNhaDesc}
                </p>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={lunchDutyType === 'outdoor'}
              onClick={() => setLunchDutyType('outdoor')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-350 ${
                lunchDutyType === 'outdoor'
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                  : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-lg">
                ☀️
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">{employeeUiCopy.attendance.presence.trucTruaNgoaiTroiTitle}</p>
                <p className="text-xs text-slate-400 leading-normal">
                  {employeeUiCopy.attendance.presence.trucTruaNgoaiTroiDesc}
                </p>
              </div>
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsLunchDutyModalOpen(false)}
              className="flex-1 border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              {attendanceUiCopy.lunchDuty.cancel}
            </Button>
            <Button
              disabled={!lunchDutyType}
              onClick={() => {
                setIsLunchDutyModalOpen(false);
                setIsCameraOpen(true);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {attendanceUiCopy.lunchDuty.continue}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
