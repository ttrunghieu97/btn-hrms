'use client';

import * as React from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AttendanceHomeScreen } from '../screens/AttendanceHomeScreen';
import { CameraCaptureDialog, type AttendanceImageSource } from '../components/camera-capture-dialog';
import { LunchDutyDialog } from '../components/lunch-duty-dialog';
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
      <LunchDutyDialog
        open={isLunchDutyModalOpen}
        onOpenChange={setIsLunchDutyModalOpen}
        lunchDutyType={lunchDutyType}
        onLunchDutyTypeChange={setLunchDutyType}
        onContinue={() => {
          setIsLunchDutyModalOpen(false);
          setIsCameraOpen(true);
        }}
      />
    </>
  );
}
