'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { certDefsQueryOptions } from '../api/queries';
import { useCreateCertDefinition } from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { CERT_STATUS_MAP, type CertificationRow } from './status-maps';
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
import { createCertDefSchema, type CreateCertDefFormValues } from '../schemas/learning.schema';

const copy = learningUiCopy.certifications;

export function CertificationsView() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCertDefFormValues>({ name: '' });

  const { data, error, isLoading, refetch } = useQuery(certDefsQueryOptions());
  const rows = extractList<CertificationRow>(data);
  const createDef = useCreateCertDefinition();

  async function handleCreate() {
    const parsed = createCertDefSchema.safeParse(form);
    if (!parsed.success) return;
    await createDef.mutateAsync(parsed.data);
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
              <div className='grid gap-2'><Label>Đơn vị cấp</Label><Input value={form.issuer ?? ''} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
              <div className='grid gap-2'><Label>Hiệu lực (tháng)</Label><Input type='number' value={form.validityMonths ?? ''} onChange={(e) => setForm({ ...form, validityMonths: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
              <Button onClick={() => void handleCreate()} disabled={createDef.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{copy.columns.issuer}</TableHead>
                <TableHead>{copy.columns.validityMonths}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell>{row.issuer ?? '—'}</TableCell>
                  <TableCell>{row.validityMonths ? `${row.validityMonths} tháng` : '—'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
