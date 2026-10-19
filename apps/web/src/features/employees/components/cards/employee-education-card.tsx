'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasAnyPermission } from '@project/permissions';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { extractList, unwrapData } from '@/lib/api-extract';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { commonUiCopy } from '@/lib/app-copy';
import { customFetch } from '@/lib/fetcher';
import { permissions } from '@/lib/permissions';
import { queryPolicyPresets } from '@/lib/query-client';
import { createKeyFactory } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth-store';

export type EducationLevel =
  | 'primary'
  | 'lower_secondary'
  | 'upper_secondary'
  | 'vocational'
  | 'college'
  | 'bachelor'
  | 'master'
  | 'doctor'
  | 'other';

export interface EmployeeEducationItem {
  id: string;
  employeeId: string;
  educationLevel: EducationLevel;
  educationName?: string | null;
  major?: string | null;
  institution?: string | null;
  graduationYear?: number | null;
  gpa?: string | number | null;
  documentId?: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertEducationPayload {
  educationLevel: EducationLevel;
  educationName?: string;
  major?: string;
  institution?: string;
  graduationYear?: number;
  gpa?: number;
  verified?: boolean;
}

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  primary: 'Tiểu học',
  lower_secondary: 'Trung học cơ sở',
  upper_secondary: 'Trung học phổ thông',
  vocational: 'Trung cấp / Nghề',
  college: 'Cao đẳng',
  bachelor: 'Đại học / Cử nhân',
  master: 'Thạc sĩ',
  doctor: 'Tiến sĩ',
  other: 'Khác',
};

const EDUCATION_LEVEL_OPTIONS: Array<{ value: EducationLevel; label: string }> = [
  { value: 'bachelor', label: 'Đại học / Cử nhân' },
  { value: 'master', label: 'Thạc sĩ' },
  { value: 'doctor', label: 'Tiến sĩ' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'vocational', label: 'Trung cấp / Nghề' },
  { value: 'upper_secondary', label: 'Trung học phổ thông' },
  { value: 'lower_secondary', label: 'Trung học cơ sở' },
  { value: 'primary', label: 'Tiểu học' },
  { value: 'other', label: 'Khác' },
];

const educationKeys = createKeyFactory<{ employeeId: string }>('employee-educations');

interface EmployeeEducationCardProps {
  employeeId: string;
}

export function EmployeeEducationCard({ employeeId }: EmployeeEducationCardProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit =
    Boolean(user?.isSuperAdmin) ||
    hasAnyPermission(user?.permissions ?? [], [
      permissions.employees.edit,
      permissions.employees.manage,
    ]);

  const educationsQuery = useQuery({
    queryKey: educationKeys.list({ employeeId }),
    queryFn: async () => {
      const res = await customFetch(`/api/v1/employees/${employeeId}/educations`);
      return extractList<EmployeeEducationItem>(res);
    },
    enabled: Boolean(employeeId),
    ...queryPolicyPresets['employees'],
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<EmployeeEducationItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<EmployeeEducationItem | null>(null);
  const [educationLevel, setEducationLevel] = React.useState<EducationLevel>('bachelor');
  const [educationName, setEducationName] = React.useState('');
  const [major, setMajor] = React.useState('');
  const [institution, setInstitution] = React.useState('');
  const [graduationYear, setGraduationYear] = React.useState('');
  const [gpa, setGpa] = React.useState('');
  const [verified, setVerified] = React.useState(false);

  const openCreateDialog = () => {
    setEditingItem(null);
    setEducationLevel('bachelor');
    setEducationName('');
    setMajor('');
    setInstitution('');
    setGraduationYear('');
    setGpa('');
    setVerified(false);
    setDialogOpen(true);
  };

  const openEditDialog = (item: EmployeeEducationItem) => {
    setEditingItem(item);
    setEducationLevel(item.educationLevel ?? 'bachelor');
    setEducationName(item.educationName ?? '');
    setMajor(item.major ?? '');
    setInstitution(item.institution ?? '');
    setGraduationYear(item.graduationYear ? String(item.graduationYear) : '');
    setGpa(item.gpa !== null && item.gpa !== undefined ? String(item.gpa) : '');
    setVerified(Boolean(item.verified));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: UpsertEducationPayload) => {
      if (editingItem) {
        const res = await customFetch(
          `/api/v1/employees/${employeeId}/educations/${editingItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        return unwrapData<EmployeeEducationItem>(res);
      }
      const res = await customFetch(`/api/v1/employees/${employeeId}/educations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return unwrapData<EmployeeEducationItem>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.list({ employeeId }) });
      toast.success(editingItem ? 'Đã cập nhật bằng cấp học vấn' : 'Đã thêm bằng cấp học vấn');
      setDialogOpen(false);
    },
    onError: (err) => {
      toast.error(getVietnameseApiErrorMessage(err, 'Không thể lưu thông tin học vấn'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (educationId: string) => {
      await customFetch(`/api/v1/employees/${employeeId}/educations/${educationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: educationKeys.list({ employeeId }) });
      toast.success('Đã xóa thông tin học vấn');
      setDeletingItem(null);
    },
    onError: (err) => {
      toast.error(getVietnameseApiErrorMessage(err, 'Không thể xóa thông tin học vấn'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedYear = graduationYear.trim() ? Number(graduationYear.trim()) : undefined;
    if (parsedYear !== undefined && (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100)) {
      toast.error('Năm tốt nghiệp phải từ 1900 đến 2100');
      return;
    }
    const parsedGpa = gpa.trim() ? Number(gpa.trim()) : undefined;
    if (parsedGpa !== undefined && (Number.isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 10)) {
      toast.error('Điểm trung bình (GPA) phải từ 0 đến 10');
      return;
    }

    const payload: UpsertEducationPayload = {
      educationLevel,
      ...(educationName.trim() ? { educationName: educationName.trim() } : {}),
      ...(major.trim() ? { major: major.trim() } : {}),
      ...(institution.trim() ? { institution: institution.trim() } : {}),
      ...(parsedYear !== undefined ? { graduationYear: parsedYear } : {}),
      ...(parsedGpa !== undefined ? { gpa: parsedGpa } : {}),
      ...(editingItem ? { verified } : {}),
    };

    saveMutation.mutate(payload);
  };

  if (educationsQuery.isLoading) {
    return <Skeleton className='h-28 w-full rounded-xl' />;
  }

  const items = educationsQuery.data ?? [];

  return (
    <>
      <Card className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-violet-500'>
        <CardHeader className='flex flex-row items-center justify-between border-b px-4 py-3'>
          <div className='flex items-center gap-3'>
            <div className='bg-violet-500/10 p-1.5 rounded-lg text-violet-600 dark:text-violet-400'>
              <Icons.school className='size-4' />
            </div>
            <CardTitle className='text-sm font-semibold text-foreground/90'>
              Trình độ học vấn &amp; Bằng cấp
            </CardTitle>
          </div>
          {canEdit && (
            <Button size='sm' variant='outline' onClick={openCreateDialog} className='h-7 text-xs'>
              <Icons.add className='mr-1 size-3.5' />
              {commonUiCopy.add}
            </Button>
          )}
        </CardHeader>
        <CardContent className='px-4 py-3'>
          {items.length === 0 ? (
            <p className='text-xs text-muted-foreground py-2'>
              Chưa có thông tin trình độ học vấn hoặc bằng cấp.
            </p>
          ) : (
            <div className='divide-y divide-border/60'>
              {items.map((item) => (
                <div
                  key={item.id}
                  className='flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0'
                >
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-medium text-foreground'>
                        {item.educationName ||
                          EDUCATION_LEVEL_LABELS[item.educationLevel] ||
                          item.educationLevel}
                      </span>
                      <Badge variant='secondary' className='text-[11px]'>
                        {EDUCATION_LEVEL_LABELS[item.educationLevel] ?? item.educationLevel}
                      </Badge>
                      {item.verified ? (
                        <Badge
                          variant='outline'
                          className='border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]'
                        >
                          <Icons.circleCheck className='mr-1 size-3' />
                          Đã xác minh
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='text-muted-foreground text-[10px]'>
                          Chưa xác minh
                        </Badge>
                      )}
                    </div>
                    <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                      {item.institution && <span>Trường: {item.institution}</span>}
                      {item.major && <span>Chuyên ngành: {item.major}</span>}
                      {item.graduationYear && <span>Năm TN: {item.graduationYear}</span>}
                      {item.gpa !== null && item.gpa !== undefined && item.gpa !== '' && (
                        <span>GPA: {item.gpa}</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className='flex shrink-0 items-center gap-1'>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='size-7'
                        onClick={() => openEditDialog(item)}
                        title='Chỉnh sửa'
                      >
                        <Icons.edit className='size-3.5 text-muted-foreground' />
                      </Button>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        className='size-7 text-destructive hover:text-destructive'
                        disabled={deleteMutation.isPending}
                        onClick={() => setDeletingItem(item)}
                        title='Xóa'
                      >
                        <Icons.trash className='size-3.5' />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Cập nhật trình độ học vấn' : 'Thêm trình độ học vấn'}
            </DialogTitle>
            <DialogDescription>
              Khai báo thông tin bằng cấp, trường đào tạo và năm tốt nghiệp của nhân viên.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Cấp bậc đào tạo *</Label>
              <Select
                value={educationLevel}
                onValueChange={(v) => setEducationLevel(v as EducationLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn cấp bậc đào tạo' />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label>Tên văn bằng / Chứng nhận</Label>
              <Input
                value={educationName}
                onChange={(e) => setEducationName(e.target.value)}
                placeholder='VD: Cử nhân Công nghệ thông tin'
              />
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label>Trường / Cơ sở đào tạo</Label>
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder='VD: ĐH Bách Khoa'
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Chuyên ngành</Label>
                <Input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder='VD: Kỹ thuật phần mềm'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Năm tốt nghiệp</Label>
                <Input
                  type='number'
                  min={1900}
                  max={2100}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder='VD: 2022'
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Điểm TB (GPA / 10)</Label>
                <Input
                  type='number'
                  step='0.01'
                  min={0}
                  max={10}
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder='VD: 8.25'
                />
              </div>
            </div>

            {editingItem && (
              <div className='flex items-center justify-between rounded-lg border px-3 py-2.5'>
                <div className='space-y-0.5'>
                  <Label className='text-xs font-medium'>Xác minh văn bằng</Label>
                  <p className='text-[11px] text-muted-foreground'>
                    Đánh dấu đã đối chiếu bản gốc hoặc bản sao công chứng
                  </p>
                </div>
                <Switch checked={verified} onCheckedChange={setVerified} />
              </div>
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setDialogOpen(false)}
                disabled={saveMutation.isPending}
              >
                {commonUiCopy.cancel}
              </Button>
              <Button type='submit' disabled={saveMutation.isPending}>
                {saveMutation.isPending ? commonUiCopy.saving : commonUiCopy.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa trình độ học vấn?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bằng cấp{' '}
              <strong>
                {deletingItem?.educationName ||
                  (deletingItem ? EDUCATION_LEVEL_LABELS[deletingItem.educationLevel] : '')}
              </strong>{' '}
              khỏi hồ sơ nhân viên?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {commonUiCopy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deletingItem) return;
                deleteMutation.mutate(deletingItem.id);
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : commonUiCopy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
