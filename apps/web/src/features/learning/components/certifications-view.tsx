'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission, permissions } from '@/lib/permissions';
import { certDefsQueryOptions, employeeCertificatesQueryOptions } from '../api/queries';
import {
  useCreateCertDefinition,
  useIssueCertificate,
  useRenewCertificate,
  useRevokeCertificate,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { CERT_STATUS_MAP, type CertificationRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface CertDefRow {
  id: string;
  name?: string;
  issuer?: string | null;
  validityMonths?: number | null;
  createdAt?: string;
}

export function CertificationsView() {
  const user = useAuthStore((s) => s.user);
  const canManage =
    !user ||
    Boolean(
      user.isSuperAdmin ||
        user.permissions?.includes('ALL') ||
        user.permissions?.includes('sys:all') ||
        hasAnyPermission(user.permissions, [permissions.learning.manage]),
    );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCertDefFormValues>({ name: '' });

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueDefId, setIssueDefId] = useState('');
  const [issueEmpId, setIssueEmpId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    user?.employeeId ?? '',
  );

  const { data, error, isLoading, refetch } = useQuery(certDefsQueryOptions());
  const rows = extractList<CertDefRow>(data);
  const defMap = useMemo(
    () => new Map(rows.map((d) => [d.id, d.name ?? d.id])),
    [rows],
  );

  const { data: employeesData } = useQuery({
    ...employeesQueryOptions({ page: 1, limit: 200 }),
    enabled: canManage,
  });
  const employees = employeesData?.employees ?? [];

  const activeEmployeeId = selectedEmployeeId || user?.employeeId || employees[0]?.id || '';
  const { data: empCertsData } = useQuery(
    employeeCertificatesQueryOptions(activeEmployeeId),
  );
  const empCerts = extractList<CertificationRow>(empCertsData);

  const createDef = useCreateCertDefinition();
  const issueCert = useIssueCertificate();
  const renewCert = useRenewCertificate();
  const revokeCert = useRevokeCertificate();

  async function handleCreate() {
    const parsed = createCertDefSchema.safeParse(form);
    if (!parsed.success) return;
    await createDef.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ name: '' });
  }

  async function handleIssue() {
    if (!issueDefId || !issueEmpId) return;
    await issueCert.mutateAsync({
      definitionId: issueDefId,
      employeeId: issueEmpId,
    });
    setIssueOpen(false);
    setSelectedEmployeeId(issueEmpId);
    setIssueDefId('');
    setIssueEmpId('');
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6'>
      {canManage ? (
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setIssueDefId(rows[0]?.id ?? '');
              setIssueEmpId(activeEmployeeId);
              setIssueOpen(true);
            }}
          >
            Cấp chứng chỉ
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <Icons.add className='mr-2 size-4' />
                {copy.create}
              </Button>
            </DialogTrigger>
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
      ) : null}

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
              {rows.map((row) => (
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

      {/* Employee Issued Certificates Section */}
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-sm font-semibold'>Chứng chỉ đã cấp cho nhân viên</h3>
          {canManage && employees.length > 0 ? (
            <Select
              value={activeEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className='h-9 w-64' aria-label='Chọn nhân viên xem chứng chỉ'>
                <SelectValue placeholder='Chọn nhân viên...' />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => {
                  const fullName =
                    [emp.lastName, emp.firstName].filter(Boolean).join(' ') ||
                    emp.username ||
                    emp.id;
                  return (
                    <SelectItem key={emp.id} value={emp.id}>
                      {fullName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {empCerts.length > 0 ? (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chứng chỉ</TableHead>
                  <TableHead>Số hiệu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày cấp</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {empCerts.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className='font-medium'>
                      {cert.definitionName ??
                        (cert.definitionId && defMap.get(cert.definitionId)) ??
                        cert.definitionId ??
                        '—'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {cert.certificateNumber ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        mapping={CERT_STATUS_MAP}
                        status={cert.status ?? 'active'}
                      />
                    </TableCell>
                    <TableCell>{cert.issuedAt ? formatDateVN(cert.issuedAt) : '—'}</TableCell>
                    <TableCell>{cert.expiresAt ? formatDateVN(cert.expiresAt) : '—'}</TableCell>
                    <TableCell className='text-right'>
                      {canManage ? (
                        <div className='flex justify-end gap-1.5'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => renewCert.mutate(cert.id)}
                            disabled={renewCert.isPending}
                          >
                            Gia hạn
                          </Button>
                          {cert.status !== 'revoked' ? (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => revokeCert.mutate(cert.id)}
                              disabled={revokeCert.isPending}
                            >
                              Thu hồi
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>
            Chưa có chứng chỉ nào được cấp cho nhân viên đang chọn.
          </p>
        )}
      </div>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Cấp chứng chỉ cho nhân viên</DialogTitle>
            <DialogDescription>
              Chọn loại chứng chỉ và nhân viên nhận chứng chỉ.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-1.5'>
              <Label>Danh mục chứng chỉ *</Label>
              <Select value={issueDefId} onValueChange={setIssueDefId}>
                <SelectTrigger>
                  <SelectValue placeholder='Chọn loại chứng chỉ...' />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((def) => (
                    <SelectItem key={def.id} value={def.id}>
                      {def.name ?? def.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label>Nhân viên *</Label>
              <Select value={issueEmpId} onValueChange={setIssueEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder='Chọn nhân viên...' />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => {
                    const fullName =
                      [emp.lastName, emp.firstName].filter(Boolean).join(' ') ||
                      emp.username ||
                      emp.id;
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        {fullName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIssueOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleIssue()}
              disabled={!issueDefId || !issueEmpId || issueCert.isPending}
            >
              Cấp chứng chỉ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
