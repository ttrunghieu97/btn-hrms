'use client';

import * as React from 'react';
import { addMonths, format, parseISO, subMonths } from 'date-fns';
import { parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/layout/section';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { MyAttendanceTable } from '../components/my-attendance-table';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CameraCaptureDialog, type AttendanceImageSource } from '../components/camera-capture-dialog';
import { LunchDutyDialog } from '../components/lunch-duty-dialog';
import type { AttendanceCommandControllerCheckAttendanceFromWebBodyImageSource } from '@/api/generated/model';
import {
  useMyMonthAttendanceQuery,
  useCheckAttendanceMutation,
  attendanceInvalidations,
  type MyAttendanceQueryParams
} from '../queries/attendance-queries';
import {
  buildMonthAttendanceRows,
} from '../utils/attendance-utils';

interface HistoryViewProps {
  canViewAll?: boolean;
}

export function HistoryView({ canViewAll = false }: HistoryViewProps) {
  const [params, setParams] = useQueryStates({
    month: parseAsString.withDefault(format(new Date(), 'yyyy-MM'))
  });

  const activeMonth = params.month;
  const queryParams = React.useMemo<MyAttendanceQueryParams>(
    () => ({ month: activeMonth, limit: 500 }),
    [activeMonth]
  );
  const { data, isLoading } = useMyMonthAttendanceQuery(queryParams);
  const attendances = React.useMemo(
    () => buildMonthAttendanceRows(data?.attendances ?? [], activeMonth),
    [activeMonth, data]
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

  const handlePrevMonth = () => {
    const current = parseISO(`${activeMonth}-01`);
    const prev = subMonths(current, 1);
    setParams({ month: format(prev, 'yyyy-MM') }).catch(() => undefined);
  };

  const handleNextMonth = () => {
    const current = parseISO(`${activeMonth}-01`);
    const next = addMonths(current, 1);
    setParams({ month: format(next, 'yyyy-MM') }).catch(() => undefined);
  };

  return (
    <Section className='h-full flex flex-col overflow-y-auto pr-1'>
      <div className='flex min-h-0 flex-1 flex-col gap-4'>
        <div className='flex items-center gap-2 self-end'>
          <Button variant='outline' size='icon' className='h-8 w-8' onClick={handlePrevMonth}>
            <Icons.chevronLeft className='h-4 w-4' />
          </Button>
          <div className='min-w-[100px] text-center text-sm font-medium'>
            {format(parseISO(`${activeMonth}-01`), 'MM/yyyy')}
          </div>
          <Button variant='outline' size='icon' className='h-8 w-8' onClick={handleNextMonth}>
            <Icons.chevronRight className='h-4 w-4' />
          </Button>
        </div>

        <MyAttendanceTable data={attendances} isLoading={isLoading} onPunch={handlePunch} />

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
      </div>
    </Section>
  );
}
