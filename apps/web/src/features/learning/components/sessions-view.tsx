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
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { formatDateVN } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/states/empty-state';
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
      <PageHeader
        title={copy.title}
        description={learningUiCopy.description}
        actions={
          <div className='flex items-center gap-2'>
            {courses.length > 0 ? (
              <Select
                value={selectedCourse ?? ''}
                onValueChange={(val) => void setParams({ courseId: val || null })}
              >
                <SelectTrigger className='w-64' aria-label='Chọn khóa học'>
                  <SelectValue placeholder='Chọn khóa học' />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size='sm'>
                  <Icons.add className='mr-1.5 size-4' />
                  {copy.create}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{copy.create}</DialogTitle>
                  <DialogDescription>{learningUiCopy.description}</DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='grid gap-2'>
                    <Label htmlFor='session-title'>{commonUiCopy.name}</Label>
                    <Input
                      id='session-title'
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='session-scheduled-at'>Thời gian</Label>
                    <Input
                      id='session-scheduled-at'
                      type='datetime-local'
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant='outline' onClick={() => setOpen(false)}>
                    {commonUiCopy.cancel}
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={createSession.isPending}>
                    {createSession.isPending && <Icons.spinner className='mr-1.5 size-4 animate-spin' />}
                    {commonUiCopy.create}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {!selectedCourse ? (
        <EmptyState icon={<Icons.page className='size-10' />} title='Chưa có khóa học' compact />
      ) : rows.length === 0 && !isLoading ? (
        <EmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact />
      ) : (
        <div className='rounded-md border overflow-hidden'>
          {/* Mobile cards view */}
          <div className='flex flex-col gap-3 p-3 md:hidden'>
            {rows.map((row) => (
              <Card key={row.id} className='p-4 space-y-2.5'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium text-foreground text-sm'>{row.title ?? '—'}</span>
                  <StatusBadge mapping={SESSION_STATUS_MAP} status={row.status ?? 'scheduled'} />
                </div>
                <div className='text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground/80'>{copy.columns.scheduledAt}: </span>
                  {row.scheduledAt ? formatDateVN(row.scheduledAt) : '—'}
                </div>
                {(row.status === 'scheduled' || row.status === 'in_progress') && (
                  <div className='pt-1 flex gap-2 justify-end'>
                    {row.status === 'scheduled' && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => publishSession.mutate({ id: row.id })}
                        disabled={publishSession.isPending}
                      >
                        Công bố
                      </Button>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => cancelSession.mutate({ id: row.id })}
                      disabled={cancelSession.isPending}
                    >
                      Hủy
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className='hidden md:block overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{commonUiCopy.name}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.scheduledAt}</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge mapping={SESSION_STATUS_MAP} status={row.status ?? 'scheduled'} />
                    </TableCell>
                    <TableCell>{row.scheduledAt ? formatDateVN(row.scheduledAt) : '—'}</TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1.5'>
                        {row.status === 'scheduled' ? (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => publishSession.mutate({ id: row.id })}
                            disabled={publishSession.isPending}
                          >
                            Công bố
                          </Button>
                        ) : null}
                        {row.status === 'scheduled' || row.status === 'in_progress' ? (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => cancelSession.mutate({ id: row.id })}
                            disabled={cancelSession.isPending}
                          >
                            Hủy
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
