'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commonUiCopy, positionUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity, validationCopy } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { departmentInvalidations, usePositionsTableQuery } from '../queries/department-queries';
import { createPositionMutation, updatePositionMutation, deletePositionMutation } from '../api/mutations';

interface PositionFormSheetProps {
  positionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = {
  name: string;
};

const nameValidator = z.string().min(1, validationCopy.position.nameRequired).max(128);

export function PositionFormSheet({ positionId, open, onOpenChange }: PositionFormSheetProps) {
  const isEdit = Boolean(positionId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const positionsQuery = usePositionsTableQuery();
  const position = React.useMemo(
    () => positionsQuery.data?.find((p) => p.id === positionId),
    [positionsQuery.data, positionId]
  );

  const deleteMutation = useMutation({
    ...deletePositionMutation,
    onSuccess: async () => {
      await departmentInvalidations.positions(getQueryClient());
      toast.success(feedbackCopy.success.deleted(feedbackEntity.position));
      onOpenChange(false);
    }
  });

  const createMutation = useMutation({
    ...createPositionMutation,
    onSuccess: async () => {
      await departmentInvalidations.positions(getQueryClient());
      toast.success(feedbackCopy.success.created(feedbackEntity.position));
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    ...updatePositionMutation,
    onSuccess: async () => {
      await departmentInvalidations.positions(getQueryClient());
      toast.success(feedbackCopy.success.updated(feedbackEntity.position));
      onOpenChange(false);
    }
  });

  const form = useAppForm({
    defaultValues: {
      name: ''
    } as FormValues,
    validators: {
      onSubmit: z.object({ name: nameValidator })
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit && positionId) {
          await updateMutation.mutateAsync({
            id: positionId,
            payload: { name: value.name.trim() }
          });
        } else {
          await createMutation.mutateAsync({ name: value.name.trim() });
        }
      } catch {
        // onError handles toast
      }
    }
  });

  const { FormTextField } = useFormFields<FormValues>();
  const isPending = createMutation.isPending || updateMutation.isPending;

  React.useEffect(() => {
    if (!open) return;

    if (isEdit) {
      form.setFieldValue('name', position?.name ?? '');
    } else {
      form.setFieldValue('name', '');
    }
  }, [open, isEdit, position?.name, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='flex flex-row items-center justify-between border-b pb-4 space-y-0'>
          <div>
            <SheetTitle>{isEdit ? positionUiCopy.editTitle : positionUiCopy.createTitle}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? positionUiCopy.editDescription
                : positionUiCopy.createDescription}
            </SheetDescription>
          </div>
          <div className='flex items-center gap-2'>
            {isEdit && positionId && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' variant='destructive' size='sm' disabled={deleteMutation.isPending}>
                    <Icons.trash className='mr-1 h-4 w-4' />
                    {commonUiCopy.delete}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{positionUiCopy.deleteTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {positionUiCopy.deleteDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{commonUiCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      onClick={() => deleteMutation.mutateAsync(positionId).catch(() => {})}
                    >
                      {commonUiCopy.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              type='submit'
              form='position-form-sheet'
              size='sm'
              isLoading={isPending || (isEdit && positionsQuery.isLoading)}
              disabled={isEdit && positionsQuery.isError}
            >
              <Icons.check className='mr-1 h-4 w-4' />
              {isEdit ? commonUiCopy.saveChanges : positionUiCopy.createAction}
            </Button>
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          {isEdit && positionsQuery.isLoading ? (
            <div className='text-muted-foreground flex min-h-32 items-center justify-center text-sm'>
              {positionUiCopy.loadingDetails}
            </div>
          ) : (
            <form.AppForm>
              <form.Form id='position-form-sheet' className='space-y-4'>
                <FormTextField
                  name='name'
                  label={positionUiCopy.nameLabel}
                  required
                  placeholder={positionUiCopy.namePlaceholder}
                />
              </form.Form>
            </form.AppForm>
          )}
        </div>


      </SheetContent>
    </Sheet>
  );
}
