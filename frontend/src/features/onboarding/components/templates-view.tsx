'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { onboardingTemplatesQueryOptions } from '../api/queries';
import { useCreateOnboardingTemplate, useDeleteOnboardingTemplate } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import type { OnboardingTemplateRow } from './status-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateVN } from "@/lib/date";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { commonUiCopy, onboardingUiCopy } from '@/locales/vi/app-copy';

const copy = onboardingUiCopy.templates;

export function OnboardingTemplatesView() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const { data, error, isLoading, refetch } = useQuery(onboardingTemplatesQueryOptions());
  const rows = extractList<OnboardingTemplateRow>(data);
  const createTemplate = useCreateOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();

  async function handleCreate() {
    if (!name.trim()) return;
    await createTemplate.mutateAsync({ name: name.trim() });
    setOpen(false);
    setName('');
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{copy.title}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size='sm'>{copy.create}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{copy.create}</DialogTitle><DialogDescription>{onboardingUiCopy.description}</DialogDescription></DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'><Label>{commonUiCopy.name}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Tên mẫu onboarding' /></div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createTemplate.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{copy.columns.type}</TableHead>
                <TableHead>{copy.columns.itemCount}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell>{row.type ?? 'onboarding'}</TableCell>
                  <TableCell>{row.itemCount ?? 0}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell>
                    <Button variant='outline' size='sm' onClick={() => deleteTemplate.mutate({ id: row.id })} disabled={deleteTemplate.isPending}>{commonUiCopy.delete}</Button>
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
