'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  publishing?: boolean;
}

export function PublishPayslipDialog({ open, onOpenChange, onConfirm, publishing }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận công bố phiếu lương</AlertDialogTitle>
          <AlertDialogDescription>
            Sau khi công bố, nhân viên sẽ có thể xem phiếu lương này.
            Thao tác này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={publishing}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={publishing}>
            {publishing ? 'Đang xử lý...' : 'Xác nhận công bố'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
