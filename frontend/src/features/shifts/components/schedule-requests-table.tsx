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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { commonUiCopy, scheduleUiCopy } from '@/lib/app-copy';
import { useAllRequests, useApproveRequest, useDenyRequest } from '../api/request-queries';

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

export function ScheduleRequestsTable() {
  const [filterStatus, setFilterStatus] = React.useState('all');
  const requestsQuery = useAllRequests(filterStatus !== 'all' ? { status: filterStatus } : undefined);
  const approveMut = useApproveRequest();
  const denyMut = useDenyRequest();

  const requests = requestsQuery.data ?? [];
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center gap-3'>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className='w-36'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='pending'>{scheduleUiCopy.requests.statusPending}</SelectItem>
            <SelectItem value='approved'>{scheduleUiCopy.requests.statusApproved}</SelectItem>
            <SelectItem value='denied'>{scheduleUiCopy.requests.statusDenied}</SelectItem>
          </SelectContent>
        </Select>
        {pendingCount > 0 && (
          <Badge variant='outline' className='text-xs'>
            {pendingCount} yêu cầu chờ
          </Badge>
        )}
      </div>

      {requestsQuery.isLoading ? (
        <div className='rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-pulse'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/20 hover:bg-transparent'>
                <TableHead><div className='h-4 w-20 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-32 rounded bg-muted' /></TableHead>
                <TableHead><div className='h-4 w-16 rounded bg-muted' /></TableHead>
                <TableHead className='w-32'><div className='h-4 w-12 rounded bg-muted' /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className='hover:bg-transparent'>
                  <TableCell><div className='h-4 w-28 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-20 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-4 w-24 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-3.5 w-40 rounded bg-muted' /></TableCell>
                  <TableCell><div className='h-5 w-16 rounded-full bg-muted' /></TableCell>
                  <TableCell><div className='h-8 w-24 rounded-md bg-muted' /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : requests.length === 0 ? (
        <div className='text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-sm'>
          <Icons.notification className='h-8 w-8 text-muted-foreground/50' />
          <p>{scheduleUiCopy.requests.empty}</p>
        </div>
      ) : (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{scheduleUiCopy.requests.employeeColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.dateColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.typeColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.reasonColumn}</TableHead>
                <TableHead>{scheduleUiCopy.requests.statusColumn}</TableHead>
                <TableHead className='w-32'>{commonUiCopy.edit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='font-medium'>{r.employeeName}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{TYPE_LABELS[r.requestType] ?? r.requestType}</TableCell>
                  <TableCell className='text-muted-foreground text-xs'>{r.reason ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[r.status] ?? 'outline'}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className='flex gap-1'>
                        <Button size='sm' variant='default' onClick={() => approveMut.mutate(r.id)} disabled={approveMut.isPending}>
                          {scheduleUiCopy.requests.acceptAction}
                        </Button>
                        <Button size='sm' variant='destructive' onClick={() => denyMut.mutate(r.id)} disabled={denyMut.isPending}>
                          {scheduleUiCopy.requests.denyAction}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
