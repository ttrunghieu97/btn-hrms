'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningPathsQueryOptions } from '../api/queries';
import { useCreateLearningPath, usePublishLearningPath } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { PATH_STATUS_MAP, type LearningPathRow } from './status-maps';
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
import { createPathSchema, type CreatePathFormValues } from '../schemas/learning.schema';

const copy = learningUiCopy.paths;

export function LearningPathsView() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePathFormValues>({ name: '' });

  const { data, error, isLoading, refetch } = useQuery(learningPathsQueryOptions());
  const rows = extractList<LearningPathRow>(data);
  const createPath = useCreateLearningPath();
  const publishPath = usePublishLearningPath();

  async function handleCreate() {
    const parsed = createPathSchema.safeParse(form);
    if (!parsed.success) return;
    await createPath.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ name: '' });
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
              <div className='grid gap-2'><Label>{commonUiCopy.name}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createPath.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={PATH_STATUS_MAP} status={row.status ?? 'draft'} /></TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell>
                    {row.status === 'draft' ? <Button variant='outline' size='sm' onClick={() => publishPath.mutate({ id: row.id })} disabled={publishPath.isPending}>Công bố</Button> : null}
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
