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
  useRehireEmployeeMutation,
  useDepartmentsQuery,
  usePositionsQuery,
} from '../../../queries/employee-queries';

interface RehireEmployeeDialogProps {
  employeeId: string;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function todayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

const CONTRACT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Không xác định thời hạn' },
  { value: 'fixed_term', label: 'Xác định thời hạn (1 - 3 năm)' },
  { value: 'probationary', label: 'Hợp đồng thử việc' },
  { value: 'part_time', label: 'Bán thời gian' },
  { value: 'service', label: 'Khoán việc / Dịch vụ' },
];

export function RehireEmployeeDialog({
  employeeId,
  employeeName,
  open,
  onOpenChange,
  onSuccess,
}: RehireEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: positions = [] } = usePositionsQuery();

  const [hireDate, setHireDate] = React.useState<string>(todayString());
  const [status, setStatus] = React.useState<'working' | 'probation'>('working');
  const [departmentId, setDepartmentId] = React.useState<string>('');
  const [positionId, setPositionId] = React.useState<string>('');
  const [contractType, setContractType] = React.useState<string>('permanent');
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      setHireDate(todayString());
      setStatus('working');
      setDepartmentId(departments[0]?.id ?? '');
      setPositionId(positions[0]?.id ?? '');
      setContractType('permanent');
      setReason('');
    }
  }, [open, departments, positions]);

  const rehireMutation = useRehireEmployeeMutation(queryClient, {
    onSuccess: () => {
      toast.success(`Đã tái tuyển dụng nhân viên ${employeeName} thành công.`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(getVietnameseApiErrorMessage(error, 'Không thể tái tuyển dụng nhân viên'));
      } else {
        toast.error('Có lỗi xảy ra khi tái tuyển dụng nhân viên');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hireDate) return;

    rehireMutation.mutate({
      id: employeeId,
      data: {
        hireDate,
        status,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        contractType,
        contractStatus: 'active',
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
              <div className='flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600'>
                <Icons.add className='size-5' />

              </div>
              <div>
                <DialogTitle>Tái tuyển dụng nhân viên</DialogTitle>
                <DialogDescription>
                  Khởi động chu kỳ làm việc mới cho{' '}
                  <span className='font-semibold text-foreground'>{employeeName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='mt-4 space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='hire-date'>Ngày tái tuyển dụng</Label>
                <Input
                  id='hire-date'
                  type='date'
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='rehire-status'>Trạng thái tiếp nhận</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as 'working' | 'probation')}
                >
                  <SelectTrigger id='rehire-status'>
                    <SelectValue placeholder='Chọn trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='working'>Chính thức (Working)</SelectItem>
                    <SelectItem value='probation'>Thử việc (Probation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='department'>Phòng ban tiếp nhận</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id='department'>
                    <SelectValue placeholder='Chọn phòng ban' />
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

              <div className='space-y-1.5'>
                <Label htmlFor='position'>Vị trí công tác</Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger id='position'>
                    <SelectValue placeholder='Chọn vị trí' />
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
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='contract-type'>Loại hợp đồng ký kết</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger id='contract-type'>
                  <SelectValue placeholder='Chọn loại hợp đồng' />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPE_OPTIONS.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='rehire-reason'>Căn cứ / Quyết định tái tuyển dụng</Label>
              <Textarea
                id='rehire-reason'
                rows={3}
                placeholder='Nhập số quyết định tiếp nhận lại hoặc ghi chú thỏa thuận...'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className='rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground'>
              <p className='font-medium text-foreground'>Kết quả của hành động:</p>
              <p className='mt-0.5'>
                Hệ thống sẽ tạo bản ghi việc làm mới, hợp đồng mới và kích hoạt lại tài khoản nhân
                viên trong tổ chức.
              </p>
            </div>
          </div>

          <DialogFooter className='mt-6 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={rehireMutation.isPending}
            >
              {commonUiCopy.cancel}
            </Button>
            <Button
              type='submit'
              disabled={rehireMutation.isPending || !hireDate}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {rehireMutation.isPending && (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              )}
              Xác nhận tái tuyển dụng
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
