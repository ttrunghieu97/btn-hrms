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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { commonUiCopy, scheduleUiCopy } from '@/lib/app-copy';
import { useQuery } from '@tanstack/react-query';
import { shiftsRosterQueryOptions } from '../api/queries';
import { useAllRequests, useCreateRequest } from '../api/request-queries';
import type { CreateScheduleRequestInput } from '../api/request-queries';
import { format, startOfWeek, addDays } from 'date-fns';

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

function getWeekRange() {
  const mon = startOfWeek(new Date(), { weekStartsOn: 1 });
  return {
    from: format(mon, 'yyyy-MM-dd'),
    to: format(addDays(mon, 6), 'yyyy-MM-dd'),
  };
}

export function MyScheduleView() {
  const [requestSheetOpen, setRequestSheetOpen] = React.useState(false);
  const [reqDate, setReqDate] = React.useState('');
  const [reqType, setReqType] = React.useState<CreateScheduleRequestInput['requestType']>('MORNING_OFF');
  const [reqReason, setReqReason] = React.useState('');
  const createRequestMut = useCreateRequest();
  const myRequestsQuery = useAllRequests();

  const weekRange = getWeekRange();
  const rosterQuery = useQuery(
    shiftsRosterQueryOptions({ from: weekRange.from, to: weekRange.to })
  );

  const rows = rosterQuery.data?.rows ?? [];
  const isPublished = rosterQuery.data?.publication?.status === 'published_locked';

  const publishedRows = rows.filter((r) => r.assignmentStatus === 'published' || isPublished);

  async function handleSubmitRequest() {
    if (!reqDate) return;
    await createRequestMut.mutateAsync({
      requestType: reqType,
      date: reqDate,
      reason: reqReason || undefined,
    });
    setRequestSheetOpen(false);
    setReqDate('');
    setReqReason('');
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{scheduleUiCopy.tabs.mySchedule}</h2>
        <Button size='sm' onClick={() => setRequestSheetOpen(true)}>
          <Icons.add className='mr-1 h-4 w-4' />{scheduleUiCopy.mySchedule.submitRequest}
        </Button>
      </div>

      {rosterQuery.isLoading ? (
        <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-pulse'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/20 hover:bg-transparent'>
                <TableHead><div className='h-4 w-20 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-24 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className='hover:bg-transparent'>
                  <TableCell><div className='h-4 w-24 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-20 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-28 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-5 w-16 rounded-full bg-muted' /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : publishedRows.length === 0 ? (
        <div className='text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-sm'>
          <Icons.calendar className='h-8 w-8 text-muted-foreground/50' />
          <p>{scheduleUiCopy.mySchedule.emptyPublished}</p>
        </div>
      ) : (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{scheduleUiCopy.mySchedule.dateLabel}</TableHead>
                <TableHead>{scheduleUiCopy.mySchedule.shiftLabel}</TableHead>
                <TableHead>{scheduleUiCopy.mySchedule.timeLabel}</TableHead>
                <TableHead>{scheduleUiCopy.mySchedule.statusLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishedRows.map((row) => (
                <TableRow key={`${row.assignmentId}-${row.workDate}`}>
                  <TableCell>{row.workDate}</TableCell>
                  <TableCell>{row.shiftTemplateName}</TableCell>
                  <TableCell>{row.startTime} - {row.endTime}</TableCell>
                  <TableCell>
                    <Badge variant='default' className='text-xs'>{scheduleUiCopy.mySchedule.published}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {myRequestsQuery.data && myRequestsQuery.data.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold'>{scheduleUiCopy.tabs.requests}</h3>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{scheduleUiCopy.requests.dateColumn}</TableHead>
                  <TableHead>{scheduleUiCopy.requests.typeColumn}</TableHead>
                  <TableHead>{scheduleUiCopy.requests.reasonColumn}</TableHead>
                  <TableHead>{scheduleUiCopy.requests.statusColumn}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequestsQuery.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{TYPE_LABELS[r.requestType] ?? r.requestType}</TableCell>
                    <TableCell className='text-muted-foreground text-xs'>{r.reason ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? 'outline'}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet open={requestSheetOpen} onOpenChange={setRequestSheetOpen}>
        <SheetContent className='flex flex-col sm:max-w-md'>
          <SheetHeader className='flex flex-row items-start justify-between border-b pb-4 space-y-0'>
            <div>
              <SheetTitle>{scheduleUiCopy.requests.submitTitle}</SheetTitle>
              <SheetDescription>{scheduleUiCopy.requests.submitDescription}</SheetDescription>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button variant='outline' size='sm' onClick={() => setRequestSheetOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button size='sm' onClick={handleSubmitRequest} disabled={!reqDate || createRequestMut.isPending} isLoading={createRequestMut.isPending}>
                {scheduleUiCopy.requests.submitAction}
              </Button>
            </div>
          </SheetHeader>
          <div className='space-y-4 py-4'>
            <div className='flex flex-col gap-2 text-sm'>
              <span className='font-medium'>{scheduleUiCopy.requests.dateLabel}</span>
              <Input type='date' value={reqDate} onChange={(e) => setReqDate(e.target.value)} />
            </div>
            <div className='flex flex-col gap-2 text-sm'>
              <span className='font-medium'>{scheduleUiCopy.requests.typeLabel}</span>
              <Select value={reqType} onValueChange={(v) => setReqType(v as CreateScheduleRequestInput['requestType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='MORNING_OFF'>{scheduleUiCopy.requests.morningOff}</SelectItem>
                  <SelectItem value='AFTERNOON_OFF'>{scheduleUiCopy.requests.afternoonOff}</SelectItem>
                  <SelectItem value='FULL_DAY_OFF'>{scheduleUiCopy.requests.fullDayOff}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-2 text-sm'>
              <span className='font-medium'>{scheduleUiCopy.requests.reasonLabel}</span>
              <Input
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder={scheduleUiCopy.requests.reasonPlaceholder}
              />
            </div>
          </div>

        </SheetContent>
      </Sheet>
    </div>
  );
}
