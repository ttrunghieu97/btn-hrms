"use client";

import * as React from "react";
import { commonUiCopy, employeeUiCopy } from "@/lib/app-copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  employeeName: string;
  onConfirm: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  isPending,
  employeeName,
  onConfirm,
}: ResetPasswordDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{employeeUiCopy.dialogs.resetPasswordTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            Mật khẩu của <span className="font-medium">{employeeName}</span> sẽ được đặt lại về giá trị mặc định.
            {' '}{employeeUiCopy.dialogs.resetPasswordDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{commonUiCopy.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? employeeUiCopy.dialogs.resetPasswordProcessing : employeeUiCopy.dialogs.resetPasswordAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
