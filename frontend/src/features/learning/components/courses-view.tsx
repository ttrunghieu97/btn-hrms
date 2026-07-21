'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coursesQueryOptions } from '../api/queries';
import { useCreateCourse, usePublishCourse } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { COURSE_STATUS_MAP, type CourseRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateVN } from "@/lib/date";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, learningUiCopy } from '@/locales/vi/app-copy';
import { createCourseSchema, type CreateCourseFormValues } from '../schemas/learning.schema';

const copy = learningUiCopy.courses;

export function CoursesView() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCourseFormValues>({ title: '' });

  const { data, error, isLoading, refetch } = useQuery(coursesQueryOptions());
  const rows = extractList<CourseRow>(data);
  const createCourse = useCreateCourse();
  const publishCourse = usePublishCourse();

  async function handleCreate() {
    const parsed = createCourseSchema.safeParse(form);
    if (!parsed.success) return;
    await createCourse.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ title: '' });
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size='sm'>{copy.create}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{copy.create}</DialogTitle><DialogDescription>{learningUiCopy.description}</DialogDescription></DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'><Label>{commonUiCopy.name}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className='grid gap-2'><Label>{commonUiCopy.description}</Label><Textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createCourse.isPending}>{commonUiCopy.create}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 && !isLoading ? <AppEmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact /> : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{commonUiCopy.name}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.estimatedHours}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={COURSE_STATUS_MAP} status={row.status ?? 'draft'} /></TableCell>
                  <TableCell>{row.estimatedHours ?? '—'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell>
                    {row.status === 'draft' ? <Button variant='outline' size='sm' onClick={() => publishCourse.mutate({ id: row.id })} disabled={publishCourse.isPending}>Công bố</Button> : null}
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
