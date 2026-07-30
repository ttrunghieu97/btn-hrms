'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { attendanceUiCopy } from '@/lib/app-copy';
import { formatTime } from '../../utils/attendance-utils';
import { useClockEventsQuery } from '../../api/timekeeping-queries';
import { CorrectionDialog } from '../dialogs/correction-dialog';
import { getAdjustmentTypeLabel } from '../utils';
import type { DateRange, AdjustmentItem } from '../types';

export function AdjustmentsTab({ dateRange }: { dateRange: DateRange }) {
  const [open, setOpen] = React.useState(false);
  const { data, error, isLoading, refetch } = useClockEventsQuery({
    from: dateRange.from,
    to: dateRange.to,
    source: 'manual',
    limit: 500,
  });

  const adjustments = data?.records ?? [];

  return (
    <>
      <div className='flex flex-col gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base'>{attendanceUiCopy.timekeeping.adjustTitle}</CardTitle>
              <p className='text-sm text-muted-foreground mt-1'>
                {attendanceUiCopy.timekeeping.adjustDescription}
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Icons.add className='mr-2 h-4 w-4' />
              {attendanceUiCopy.timekeeping.createAdjust}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : error ? (
              <QueryErrorAlert error={error} subject={attendanceUiCopy.timekeeping.adjustSubject} onRetry={() => refetch()} />
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.date}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.employee}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.eventType}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.time}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.note}</TableHead>
                      <TableHead>{attendanceUiCopy.timekeeping.adjustTable.creator}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className='text-center text-muted-foreground py-6'>
                          {attendanceUiCopy.timekeeping.adjustTable.empty}
                        </TableCell>
                      </TableRow>
                    )}
                    {adjustments.map((adj: AdjustmentItem) => {
                      const empName = adj.employee ? `${adj.employee.firstName} ${adj.employee.lastName}` : '--';
                      const eventTypeLabel = getAdjustmentTypeLabel(adj.type ?? '');
                      return (
                        <TableRow key={adj.id}>
                          <TableCell className='font-medium'>{adj.date}</TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span>{empName}</span>
                              <span className='text-xs text-muted-foreground'>{adj.employee?.employeeCode || adj.employee?.code || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={adj.type === 'check_in' ? 'default' : 'secondary'}>
                              {eventTypeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-mono'>{formatTime(adj.time)}</TableCell>
                          <TableCell className='max-w-xs truncate text-muted-foreground' title={adj.note || adj.reason}>
                            {adj.note || adj.reason || '--'}
                          </TableCell>
                          <TableCell>{adj.actorUserId ? attendanceUiCopy.timekeeping.adjustTable.systemCreator : 'Hệ thống'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CorrectionDialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          refetch().catch(() => undefined);
        }
      }} />
    </>
  );
}
