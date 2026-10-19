'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import { ApiError } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  useDepartmentsQuery,
  usePositionsQuery,
  useRequestTransferMutation,
} from '../../../queries/employee-queries';

interface RequestTransferDialogProps {
  employeeId: string;
  employeeName: string;
  currentDepartmentName?: string | null;
  currentPositionName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export function RequestTransferDialog({
  employeeId,
  employeeName,
  currentDepartmentName,
  currentPositionName,
  open,
  onOpenChange,
  onSuccess,
}: RequestTransferDialogProps) {
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: positions = [] } = usePositionsQuery();

  const [effectiveDate, setEffectiveDate] = React.useState<string>(todayString());
  const [toDepartmentId, setToDepartmentId] = React.useState<string>('');
  const [toPositionId, setToPositionId] = React.useState<string>('');
  const [toJobTitle, setToJobTitle] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      setEffectiveDate(todayString());
      setToDepartmentId(departments[0]?.id ?? '');
      setToPositionId('');
      setToJobTitle('');
      setReason('');
    }
  }, [open, departments]);

  const handlePositionChange = (posId: string) => {
    setToPositionId(posId);
    const matched = positions.find((p) => p.id === posId);
    if (matched) {
      setToJobTitle(matched.name);
    }
  };

  const requestTransferMutation = useRequestTransferMutation(queryClient, {
    onSuccess: () => {
      toast.success(
        `Đã khởi tạo yêu cầu điều chuyển công tác cho ${employeeName}. Đang chờ Quản lý phê duyệt.`
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(
          getVietnameseApiErrorMessage(error, 'Không thể khởi tạo yêu cầu điều chuyển công tác')
        );
      } else {
        toast.error('Có lỗi xảy ra khi gửi yêu cầu điều chuyển công tác');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDate || !toDepartmentId) return;

    requestTransferMutation.mutate({
      id: employeeId,
      data: {
        effectiveDate,
        toDepartmentId,
        toPositionId: toPositionId || undefined,
        toJobTitle: toJobTitle.trim() || undefined,
        reason: reason.trim() || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[540px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div className='flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600'>
                <Icons.department className='size-5' />
              </div>
              <div>
                <DialogTitle>Điều chuyển công tác & vị trí</DialogTitle>
                <DialogDescription>
                  Khởi tạo quy trình phê duyệt 2 cấp (Quản lý → Nhân sự) cho{' '}
                  <span className='text-foreground font-semibold'>{employeeName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='mt-4 space-y-4'>
            {(currentDepartmentName || currentPositionName) && (
              <div className='bg-muted/40 border-border/60 flex items-center justify-between rounded-lg border px-3 py-2 text-xs'>
                <span className='text-muted-foreground'>Đơn vị / chức danh hiện tại:</span>
                <span className='text-foreground font-medium'>
                  {[currentDepartmentName, currentPositionName].filter(Boolean).join(' • ')}
                </span>
              </div>
            )}

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label
                  htmlFor='transfer-effective-date'
                  className='after:text-destructive after:ml-0.5 after:content-["*"]'
                >
                  Ngày hiệu lực điều chuyển
                </Label>
                <Input
                  id='transfer-effective-date'
                  type='date'
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label
                  htmlFor='transfer-department'
                  className='after:text-destructive after:ml-0.5 after:content-["*"]'
                >
                  Phòng ban tiếp nhận mới
                </Label>
                <Select value={toDepartmentId} onValueChange={setToDepartmentId}>
                  <SelectTrigger id='transfer-department'>
                    <SelectValue placeholder='Chọn phòng ban mới' />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='transfer-position'>Vị trí chuẩn (Danh mục)</Label>
                <Select value={toPositionId} onValueChange={handlePositionChange}>
                  <SelectTrigger id='transfer-position'>
                    <SelectValue placeholder='Giữ nguyên hoặc chọn mới' />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='transfer-job-title'>Chức danh hiển thị mới</Label>
                <Input
                  id='transfer-job-title'
                  placeholder='VD: Trưởng nhóm Kỹ thuật'
                  value={toJobTitle}
                  onChange={(e) => setToJobTitle(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='transfer-reason'>Lý do / Căn cứ quyết định điều chuyển</Label>
              <Textarea
                id='transfer-reason'
                rows={3}
                placeholder='Nhập căn cứ điều động, bổ nhiệm hoặc luân chuyển nội bộ...'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className='rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground'>
              <p className='text-foreground font-medium'>Quy trình phê duyệt điều chuyển:</p>
              <p className='mt-0.5'>
                1. Quản lý phê duyệt (Manager Approval) → 2. Nhân sự phê duyệt (HR Approval) → 3. Tự
                động áp dụng vào ngày hiệu lực và ghi nhận lịch sử công tác.
              </p>
            </div>
          </div>

          <DialogFooter className='mt-6 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={requestTransferMutation.isPending}
            >
              {commonUiCopy.cancel}
            </Button>
            <Button
              type='submit'
              disabled={requestTransferMutation.isPending || !effectiveDate || !toDepartmentId}
            >
              {requestTransferMutation.isPending && (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              )}
              Gửi yêu cầu điều chuyển
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
