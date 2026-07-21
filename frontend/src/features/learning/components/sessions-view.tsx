'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { sessionsQueryOptions, coursesQueryOptions } from '../api/queries';
import { useCreateSession, usePublishSession, useCancelSession } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { SESSION_STATUS_MAP, type SessionRow, type CourseRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateVN } from "@/lib/date";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, learningUiCopy } from '@/locales/vi/app-copy';
import { createSessionSchema, type CreateSessionFormValues } from '../schemas/learning.schema';

const copy = learningUiCopy.sessions;

export function SessionsView() {
  const [params, setParams] = useQueryStates({ courseId: parseAsString });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSessionFormValues>({ courseId: params.courseId ?? '', title: '', scheduledAt: '' });

  const { data: coursesData } = useQuery(coursesQueryOptions());
  const courses = extractList<CourseRow>(coursesData);
  const selectedCourse = params.courseId || courses[0]?.id;

  const { data, error, isLoading, refetch } = useQuery({ ...sessionsQueryOptions(selectedCourse ?? ''), enabled: !!selectedCourse });
  const rows = extractList<SessionRow>(data);

  const createSession = useCreateSession();
  const publishSession = usePublishSession();
  const cancelSession = useCancelSession();

  async function handleCreate() {
    const parsed = createSessionSchema.safeParse(form);
    if (!parsed.success) return;
    await createSession.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ courseId: selectedCourse ?? '', title: '', scheduledAt: '' });
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <div className='flex items-center gap-2'>
          {courses.length > 0 ? (
            <select className='flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm' value={selectedCourse ?? ''} onChange={(e) => void setParams({ courseId: e.target.value || null })}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          ) : null}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size='sm'>{copy.create}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{copy.create}</DialogTitle><DialogDescription>{learningUiCopy.description}</DialogDescription></DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='grid gap-2'><Label>{commonUiCopy.name}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className='grid gap-2'><Label>Thời gian</Label><Input type='datetime-local' value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
                <Button onClick={() => void handleCreate()} disabled={createSession.isPending}>{commonUiCopy.create}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {!selectedCourse ? <AppEmptyState icon={<Icons.page className='size-10' />} title='Chưa có khóa học' compact />
        : rows.length === 0 && !isLoading ? <AppEmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact /> : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{commonUiCopy.name}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.scheduledAt}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={SESSION_STATUS_MAP} status={row.status ?? 'scheduled'} /></TableCell>
                  <TableCell>{row.scheduledAt ? formatDateVN(row.scheduledAt) : '—'}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {row.status === 'scheduled' ? <Button variant='outline' size='sm' onClick={() => publishSession.mutate({ id: row.id })} disabled={publishSession.isPending}>Công bố</Button> : null}
                      {row.status === 'scheduled' || row.status === 'in_progress' ? <Button variant='outline' size='sm' onClick={() => cancelSession.mutate({ id: row.id })} disabled={cancelSession.isPending}>Hủy</Button> : null}
                    </div>
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
