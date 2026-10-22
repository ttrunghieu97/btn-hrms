'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesQueryOptions } from '@/features/employees';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission, permissions } from '@/lib/permissions';
import { coursesQueryOptions, myEnrollmentsQueryOptions } from '../api/queries';
import {
  useCreateCourse,
  usePublishCourse,
  useEnrollCourse,
  useCompleteCourseEnrollment,
  useAssignCourse,
} from '../api/mutations';
import { extractList } from '@/lib/api-extract';
import { COURSE_STATUS_MAP, ENROLLMENT_STATUS_MAP, type CourseRow } from './status-maps';
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
import { createCourseSchema, type CreateCourseFormValues } from '../schemas/learning.schema';
import { toast } from 'sonner';

const copy = learningUiCopy.courses;

interface EnrollmentItem {
  id: string;
  courseId?: string;
  status?: string;
  progressPercent?: number;
}

export function CoursesView() {
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
  const [form, setForm] = useState<CreateCourseFormValues>({ title: '' });
  const [assignCourseId, setAssignCourseId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const { data, error, isLoading, refetch } = useQuery(coursesQueryOptions());
  const rows = extractList<CourseRow>(data);
  const courseMap = useMemo(
    () => new Map(rows.map((c) => [c.id, c.title ?? c.id])),
    [rows],
  );

  const { data: enrollmentsData } = useQuery(myEnrollmentsQueryOptions());
  const enrollments = extractList<EnrollmentItem>(enrollmentsData);

  const { data: employeesData } = useQuery({
    ...employeesQueryOptions({ page: 1, limit: 200 }),
    enabled: canManage,
  });
  const employees = employeesData?.employees ?? [];

  const createCourse = useCreateCourse();
  const publishCourse = usePublishCourse();
  const enrollCourse = useEnrollCourse();
  const completeEnrollment = useCompleteCourseEnrollment();
  const assignCourse = useAssignCourse();

  async function handleCreate() {
    const parsed = createCourseSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin');
      return;
    }
    await createCourse.mutateAsync(parsed.data);
    setOpen(false);
    setForm({ title: '' });
  }

  async function handleAssign() {
    if (!assignCourseId || !assignEmployeeId) return;
    await assignCourse.mutateAsync({
      courseId: assignCourseId,
      employeeIds: [assignEmployeeId],
      ...(assignDueDate ? { dueDate: assignDueDate } : {}),
    });
    setAssignCourseId(null);
    setAssignEmployeeId('');
    setAssignDueDate('');
  }

  if (error && !isLoading) return <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6'>
      {canManage ? (
        <div className='flex items-center justify-end gap-4'>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size='sm'>
                <Icons.add className='mr-1.5 size-4' />
                {copy.create}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{copy.create}</DialogTitle><DialogDescription>{learningUiCopy.description}</DialogDescription></DialogHeader>
              <div className='grid gap-4 py-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='course-title'>{commonUiCopy.name}</Label>
                  <Input
                    id='course-title'
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='course-hours'>{copy.columns.estimatedHours}</Label>
                  <Input
                    id='course-hours'
                    type='number'
                    min={0}
                    value={form.estimatedHours ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedHours: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder='Ví dụ: 8'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='course-desc'>{commonUiCopy.description}</Label>
                  <Textarea
                    id='course-desc'
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>{commonUiCopy.cancel}</Button>
                <Button onClick={() => void handleCreate()} disabled={createCourse.isPending}>{commonUiCopy.create}</Button>
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
                <TableHead>{copy.columns.estimatedHours}</TableHead>
                <TableHead>{commonUiCopy.date}</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.title ?? '—'}</TableCell>
                  <TableCell><StatusBadge mapping={COURSE_STATUS_MAP} status={row.status ?? 'draft'} /></TableCell>
                  <TableCell>{row.estimatedHours ?? '—'}</TableCell>
                  <TableCell>{row.createdAt ? formatDateVN(row.createdAt) : '—'}</TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      {row.status === 'draft' ? (
                        canManage ? (
                          <Button variant='outline' size='sm' onClick={() => publishCourse.mutate({ id: row.id })} disabled={publishCourse.isPending}>
                            Công bố
                          </Button>
                        ) : null
                      ) : (
                        <>
                          <Button variant='outline' size='sm' onClick={() => enrollCourse.mutate(row.id)} disabled={enrollCourse.isPending}>
                            Ghi danh
                          </Button>
                          {canManage ? (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setAssignCourseId(row.id)}
                            >
                              Giao học
                            </Button>
                          ) : null}
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

      {enrollments.length > 0 ? (
        <div className='space-y-2'>
          <h3 className='text-sm font-semibold'>Khóa học đã ghi danh của tôi</h3>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enr) => (
                  <TableRow key={enr.id}>
                    <TableCell className='font-medium'>
                      {(enr.courseId && courseMap.get(enr.courseId)) ?? enr.courseId ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        mapping={ENROLLMENT_STATUS_MAP}
                        status={enr.status ?? 'active'}
                      />
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {enr.progressPercent ?? (enr.status === 'completed' ? 100 : 0)}%
                    </TableCell>
                    <TableCell className='text-right'>
                      {enr.status !== 'completed' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => completeEnrollment.mutate(enr.id)}
                          disabled={completeEnrollment.isPending}
                        >
                          Hoàn thành
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(assignCourseId)}
        onOpenChange={(v) => !v && setAssignCourseId(null)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Giao khóa học cho nhân viên</DialogTitle>
            <DialogDescription>
              Chọn nhân viên và hạn hoàn thành cho khóa học bắt buộc / đề xuất.
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
            <div className='grid gap-1.5'>
              <Label htmlFor='assign-course-due'>Hạn hoàn thành (tùy chọn)</Label>
              <Input
                id='assign-course-due'
                type='date'
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAssignCourseId(null)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleAssign()}
              disabled={!assignEmployeeId || assignCourse.isPending}
            >
              Giao khóa học
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
