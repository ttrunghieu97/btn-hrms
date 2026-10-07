'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commonUiCopy, departmentUiCopy } from '@/lib/app-copy';
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
import {
  useDepartmentDetailQuery,
  departmentInvalidations,
  type DepartmentMutationPayload
} from '../queries/department-queries';
import {
  createDepartmentMutation,
  updateDepartmentMutation,
  deleteDepartmentMutation
} from '../api/mutations';

interface DepartmentFormSheetProps {
  departmentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = {
  name: string;
  description?: string;
};

const nameValidator = z.string().min(1, validationCopy.department.nameRequired).max(128);

export function DepartmentFormSheet({ departmentId, open, onOpenChange }: DepartmentFormSheetProps) {
  const isEdit = Boolean(departmentId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const detailQuery = useDepartmentDetailQuery(departmentId, open && isEdit);

  const deleteMutation = useMutation({
    ...deleteDepartmentMutation,
    onSuccess: async () => {
      await departmentInvalidations.list(getQueryClient());
      toast.success(feedbackCopy.success.deleted(feedbackEntity.department));
      onOpenChange(false);
    }
  });

  const createMutation = useMutation({
    ...createDepartmentMutation,
    onSuccess: async () => {
      await departmentInvalidations.list(getQueryClient());
      toast.success(feedbackCopy.success.created(feedbackEntity.department));
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    ...updateDepartmentMutation,
    onSuccess: async () => {
      await departmentInvalidations.list(getQueryClient());
      toast.success(feedbackCopy.success.updated(feedbackEntity.department));
      onOpenChange(false);
    }
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: ''
    } as FormValues,
    validators: {
      onSubmit: z.object({
        name: nameValidator,
        description: z.string().max(500).optional()
      })
    },
    onSubmit: async ({ value }) => {
      const payload: DepartmentMutationPayload = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined
      };

      try {
        if (isEdit && departmentId) {
          await updateMutation.mutateAsync({ id: departmentId, payload });
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // onError handles toast
      }
    }
  });

  const { FormTextField, FormTextareaField } = useFormFields<FormValues>();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const detail = detailQuery.data;

  React.useEffect(() => {
    if (!open) return;

    if (isEdit) {
      form.setFieldValue('name', detail?.name ?? '');
      form.setFieldValue('description', detail?.description ?? '');
    } else {
      form.setFieldValue('name', '');
      form.setFieldValue('description', '');
    }
  }, [open, isEdit, detail?.name, detail?.description, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='flex flex-row items-center justify-between border-b pb-4 space-y-0'>
          <div>
            <SheetTitle>{isEdit ? departmentUiCopy.editTitle : departmentUiCopy.createTitle}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? departmentUiCopy.editDescription
                : departmentUiCopy.createDescription}
            </SheetDescription>
          </div>
          <div className='flex items-center gap-2'>
            {isEdit && departmentId && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' variant='destructive' size='sm' disabled={deleteMutation.isPending}>
                    <Icons.trash className='mr-1 h-4 w-4' />
                    {commonUiCopy.delete}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{departmentUiCopy.deleteTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {departmentUiCopy.deleteDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{commonUiCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      onClick={() => deleteMutation.mutateAsync(departmentId).catch(() => {})}
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
              form='department-form-sheet'
              size='sm'
              isLoading={isPending || (isEdit && detailQuery.isLoading)}
              disabled={isEdit && detailQuery.isError}
            >
              <Icons.check className='mr-1 h-4 w-4' />
              {isEdit ? commonUiCopy.saveChanges : departmentUiCopy.createAction}
            </Button>
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          {isEdit && detailQuery.isLoading ? (
            <div className='text-muted-foreground flex min-h-32 items-center justify-center text-sm'>
              {departmentUiCopy.loadingDetails}
            </div>
          ) : (
            <form.AppForm>
              <form.Form id='department-form-sheet' className='space-y-4'>
                <FormTextField
                  name='name'
                  label={departmentUiCopy.nameLabel}
                  required
                  placeholder={departmentUiCopy.namePlaceholder}
                />
                <FormTextareaField
                  name='description'
                  label={departmentUiCopy.descriptionLabel}
                  placeholder={departmentUiCopy.descriptionPlaceholder}
                />
              </form.Form>
            </form.AppForm>
          )}
        </div>


      </SheetContent>
    </Sheet>
  );
}
