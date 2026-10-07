'use client';

import * as React from 'react';
import { commonUiCopy } from '@/lib/app-copy';
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

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = commonUiCopy.confirmDialogTitle,
  description = commonUiCopy.cannotUndoDescription,
  cancelLabel = commonUiCopy.cancel,
  confirmLabel = commonUiCopy.confirm
}: AlertModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onClose}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? commonUiCopy.deleting : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
