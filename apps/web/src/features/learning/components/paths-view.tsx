'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission, permissions } from '@/lib/permissions';
import { learningPathsQueryOptions } from '../api/queries';
import {
  useCreateLearningPath,
  usePublishLearningPath,
  useAssignLearningPath,
  useCompleteLearningPath,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { PATH_STATUS_MAP, type LearningPathRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { createPathSchema, type CreatePathFormValues } from '../schemas/learning.schema';

const copy = learningUiCopy.paths;

export function LearningPathsView() {
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
  const [form, setForm] = useState<CreatePathFormValues>({ name: '', description: '' });
  const [assignPathId, setAssignPathId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  const { data, error, isLoading, refetch } = useQuery(learningPathsQueryOptions());
  const rows = extractList<LearningPathRow>(data);

  const { data: employeesData } = useQuery({
    ...employeesQueryOptions({ page: 1, limit: 200 }),
    enabled: canManage,
  });
  const employees = employeesData?.employees ?? [];

  const createPath = useCreateLearningPath();
  const publishPath = usePublishLearningPath();
  const assignPath = useAssignLearningPath();
  const completePath = useCompleteLearningPath();

  async function handleCreate() {
    const parsed = createPathSchema.safeParse(form);
    if (!parsed.success) return;
    await createPath.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ name: '', description: '' });
  }

  async function handleAssign() {
    if (!assignPathId || !assignEmployeeId) return;
    await assignPath.mutateAsync({
      pathId: assignPathId,
      employeeIds: [assignEmployeeId],
    });
    setAssignPathId(null);
    setAssignEmployeeId('');
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      {canManage ? (
        <div className='flex items-center justify-end gap-2'>
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
                <div className='grid gap-2'>
                  <Label htmlFor='path-name'>{commonUiCopy.name}</Label>
                  <Input
                    id='path-name'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='path-desc'>{commonUiCopy.description}</Label>
                  <Textarea
                    id='path-desc'
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
                <Button onClick={() => void handleCreate()} disabled={createPath.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={PATH_STATUS_MAP} status={row.status ?? 'draft'} /></TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1.5'>
                      {row.status === 'draft' ? (
                        canManage ? (
                          <Button variant='outline' size='sm' onClick={() => publishPath.mutate({ id: row.id })} disabled={publishPath.isPending}>
                            Công bố
                          </Button>
                        ) : null
                      ) : (
                        <>
                          {canManage ? (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setAssignPathId(row.id)}
                            >
                              Gán nhân viên
                            </Button>
                          ) : null}
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => completePath.mutate(row.id)}
                            disabled={completePath.isPending}
                          >
                            Hoàn thành
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(assignPathId)}
        onOpenChange={(v) => !v && setAssignPathId(null)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Gán lộ trình học tập cho nhân viên</DialogTitle>
            <DialogDescription>
              Chọn nhân viên để gán lộ trình đào tạo này.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-1.5'>
              <Label>Nhân viên *</Label>
              <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
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
            <Button variant='outline' onClick={() => setAssignPathId(null)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleAssign()}
              disabled={!assignEmployeeId || assignPath.isPending}
            >
              Gán lộ trình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
