// NOTE: This component is unused. See my-attendance-view.tsx for the active implementation.
'use client';

import * as React from 'react';
import { addMonths, format, parseISO, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { parseAsString, useQueryStates } from 'nuqs';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '@/components/file-uploader';
import { Section } from '@/components/layout/section';
import { attendanceUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import { MyAttendanceTable } from '../components/my-attendance-table';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CameraCaptureDialog, type AttendanceImageSource } from '../components/camera-capture-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { AttendanceCommandControllerCheckAttendanceFromWebBodyImageSource } from '@/api/generated/model';
import {
  useMyMonthAttendanceQuery,
  useCheckAttendanceMutation,
  attendanceInvalidations,
  type MyAttendanceQueryParams
} from '../queries/attendance-queries';
import {
  buildMonthAttendanceRows,
  formatTime,
  toDateString,
  getSessionStatus,
  calculateMonthStats,
  formatMinutesToHm
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

  const todayStr = React.useMemo(() => toDateString(new Date()), []);
  const todayRecord = React.useMemo(
    () => attendances.find((attendance) => attendance.date === todayStr),
    [attendances, todayStr]
  );

  const todayStatusInfo = React.useMemo(() => {
    const hour = new Date().getHours();
    return getSessionStatus(todayRecord, hour);
  }, [todayRecord]);

  const todayStatus = todayStatusInfo.status;

  const todayStatusLabel = React.useMemo(() => {
    if (todayStatus === 'checked-out') return attendanceUiCopy.tabs.checkedOut;
    if (todayStatus === 'checked-in') return attendanceUiCopy.tabs.checkedIn;
    return attendanceUiCopy.tabs.notCheckedIn;
  }, [todayStatus]);

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
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='flex flex-col gap-6'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>{attendanceUiCopy.tabs.todayStatusTitle}</CardTitle>
              <CardDescription>
                {format(new Date(), 'eeee, dd/MM/yyyy', { locale: vi })}
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center gap-4'>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    todayStatus === 'not-checked-in'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icons.check className='h-6 w-6' />
                </div>
                <div>
                  <div className='text-xl font-semibold'>{todayStatusLabel}</div>
                  <p className='text-muted-foreground text-sm'>
                    {todayStatus === 'not-checked-in'
                      ? attendanceUiCopy.tabs.startDayDescription
                      : attendanceUiCopy.tabs.completedDescription}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3 pt-2'>
                <div className='bg-muted/30 flex flex-col gap-1 rounded-lg p-3'>
                  <span className='text-muted-foreground text-xs font-medium'>
                    {attendanceUiCopy.tabs.morningCheckinLabel}
                  </span>
                  <span className='font-mono text-sm'>
                    {todayRecord?.morningCheckin
                      ? formatTime(todayRecord.morningCheckin)
                      : '--:--'}
                  </span>
                </div>
                <div className='bg-muted/30 flex flex-col gap-1 rounded-lg p-3'>
                  <span className='text-muted-foreground text-xs font-medium'>
                    {attendanceUiCopy.tabs.afternoonCheckoutLabel}
                  </span>
                  <span className='font-mono text-sm'>
                    {todayRecord?.afternoonCheckout
                      ? formatTime(todayRecord.afternoonCheckout)
                      : '--:--'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>{attendanceUiCopy.tabs.uploadTitle}</CardTitle>
              <CardDescription>{attendanceUiCopy.tabs.uploadDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                maxFiles={1}
                maxSize={1024 * 1024 * 5}
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls'],
                  'text/csv': ['.csv']
                }}
                onUpload={async () => {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className='flex flex-col gap-6'>
          <Card className='h-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg'>{attendanceUiCopy.tabs.eventsTitle}</CardTitle>
              <CardDescription>{attendanceUiCopy.tabs.eventsDescription}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {todayRecord ? (
                <div className='space-y-4'>
                  {[
                    {
                      label: attendanceUiCopy.tabs.eventMorningCheckin,
                      time: todayRecord.morningCheckin,
                      icon: Icons.login
                    },
                    {
                      label: attendanceUiCopy.tabs.eventMorningCheckout,
                      time: todayRecord.morningCheckout,
                      icon: Icons.logout
                    },
                    {
                      label: attendanceUiCopy.tabs.eventNoonCheck,
                      time: todayRecord.noonCheck,
                      icon: Icons.clock
                    },
                    {
                      label: attendanceUiCopy.tabs.eventAfternoonCheckin,
                      time: todayRecord.afternoonCheckin,
                      icon: Icons.login
                    },
                    {
                      label: attendanceUiCopy.tabs.eventAfternoonCheckout,
                      time: todayRecord.afternoonCheckout,
                      icon: Icons.logout
                    }
                  ]
                    .filter((event) => event.time)
                    .map((event, idx) => (
                      <div key={idx} className='flex items-center justify-between border-b pb-2'>
                        <div className='flex items-center gap-3'>
                          <div className='bg-primary/5 flex h-8 w-8 items-center justify-center rounded-full'>
                            <event.icon className='text-primary h-4 w-4' />
                          </div>
                          <span className='text-sm font-medium'>{event.label}</span>
                        </div>
                        <span className='font-mono text-sm'>{formatTime(event.time)}</span>
                      </div>
                    ))}

                  {!todayRecord.morningCheckin &&
                    !todayRecord.afternoonCheckin &&
                    !todayRecord.noonCheck && (
                      <div className='text-muted-foreground flex h-32 items-center justify-center text-sm italic'>
                        {attendanceUiCopy.noTodayData}
                      </div>
                    )}
                </div>
              ) : (
                <div className='text-muted-foreground flex h-32 items-center justify-center text-sm italic'>
                  {attendanceUiCopy.noTodayData}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='mt-6'>
        <MyAttendanceTable data={attendances} isLoading={isLoading} onPunch={handlePunch} />
      </div>

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
    </div>
    </Section>
  );
}
