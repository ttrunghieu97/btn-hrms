'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface UnauthorizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  requestId?: string;
}

export function UnauthorizedDialog({
  open,
  onOpenChange,
  title = 'Không đủ quyền thực hiện',
  description = 'Bạn không có quyền thực hiện thao tác này. Hãy liên hệ quản trị viên nếu bạn nghĩ đây là sự nhầm lẫn.',
  requestId,
}: UnauthorizedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{title}</DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        {requestId && (
          <div className="rounded bg-muted/60 p-2 text-xs font-mono text-muted-foreground">
            Mã sự cố: {requestId}
          </div>
        )}
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
