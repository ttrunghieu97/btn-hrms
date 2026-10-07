'use client';

import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
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
import type { Role } from '../api/service';

interface RoleDeleteDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

export function RoleDeleteDialog({ role, open, onOpenChange, isPending, onConfirm }: RoleDeleteDialogProps) {
  const permissionCount = role?.permissions?.length ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{roleUiCopy.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {roleUiCopy.deleteDescription(role?.name, permissionCount)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{commonUiCopy.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? commonUiCopy.deleting : roleUiCopy.deleteAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
