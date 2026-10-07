'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { commonUiCopy, shiftUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
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
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import {
  archiveShiftTemplateMutation,
  createShiftTemplateMutation,
  updateShiftTemplateMutation
} from '../api/mutations';
import type { ShiftTemplateRow } from '../api/queries';
import {
  shiftTemplateFormSchema,
  type ShiftTemplateFormValues
} from '../schemas/shift-form.schema';

interface TemplateFormSheetProps {
  template?: ShiftTemplateRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const weekdayOptions = [
  { value: 'mon', label: 'T2' },
  { value: 'tue', label: 'T3' },
  { value: 'wed', label: 'T4' },
  { value: 'thu', label: 'T5' },
  { value: 'fri', label: 'T6' },
  { value: 'sat', label: 'T7' },
  { value: 'sun', label: 'CN' }
] as const;

export function TemplateFormSheet({ template, open, onOpenChange }: TemplateFormSheetProps) {
  const isEdit = Boolean(template);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const createMutation = useMutation({
    ...createShiftTemplateMutation,
    onSuccess: async (...args) => {
      await createShiftTemplateMutation.onSuccess?.(...args);
      toast.success(feedbackCopy.success.created(feedbackEntity.shiftTemplate));
      onOpenChange(false);
    }
  });

  const updateMutation = useMutation({
    ...updateShiftTemplateMutation,
    onSuccess: async (...args) => {
      await updateShiftTemplateMutation.onSuccess?.(...args);
      toast.success(feedbackCopy.success.updated(feedbackEntity.shiftTemplate));
      onOpenChange(false);
    }
  });

  const archiveMutation = useMutation({
    ...archiveShiftTemplateMutation,
    onSuccess: async (...args) => {
      await archiveShiftTemplateMutation.onSuccess?.(...args);
      toast.success(feedbackCopy.success.archived(feedbackEntity.shiftTemplate));
      onOpenChange(false);
    }
  });

  const form = useAppForm({
    defaultValues: {
      code: template?.code ?? '',
      name: template?.name ?? '',
      startTime: template?.startTime ?? '08:00',
      endTime: template?.endTime ?? '17:00',
      activeWeekdays:
        template?.activeWeekdays ?? ['mon', 'tue', 'wed', 'thu', 'fri']
    } satisfies ShiftTemplateFormValues,
    validators: {
      onSubmit: shiftTemplateFormSchema
    },
    onSubmit: async ({ value }) => {
      const payload = {
        code: value.code.trim(),
        name: value.name.trim(),
        startTime: value.startTime,
        endTime: value.endTime,
        breakMinutes: 0,
        overnight: false,
        activeWeekdays: value.activeWeekdays
      };

      try {
        if (isEdit && template?.id) {
          await updateMutation.mutateAsync({ id: template.id, payload });
          return;
        }

        await createMutation.mutateAsync(payload);
      } catch {
        // onError handles toast
      }
    }
  });

  const { FormTextField, FormSelectField } = useFormFields<ShiftTemplateFormValues>();
  const isPending =
    createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-xl'>
        <SheetHeader className='flex flex-row items-start justify-between border-b pb-4 space-y-0'>
          <div>
            <SheetTitle>
              {isEdit ? shiftUiCopy.templates.editTitle : shiftUiCopy.templates.createTitle}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? shiftUiCopy.templates.editDescription
                : shiftUiCopy.templates.createDescription}
            </SheetDescription>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {isEdit && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' variant='destructive' size='sm' disabled={archiveMutation.isPending}>
                    <Icons.trash className='mr-1 h-4 w-4' />
                    {shiftUiCopy.templates.archive}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{shiftUiCopy.templates.archiveTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {shiftUiCopy.templates.archiveDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{commonUiCopy.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMutation.mutateAsync(template!.id).catch(() => {})}
                    >
                      {shiftUiCopy.templates.archive}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)} disabled={isPending}>
              {commonUiCopy.cancel}
            </Button>
            <Button type='submit' form='shift-template-form' size='sm' isLoading={isPending}>
              <Icons.check className='mr-1 h-4 w-4' />
              {isEdit ? commonUiCopy.saveChanges : shiftUiCopy.templates.createAction}
            </Button>
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form.AppForm>
            <form.Form id='shift-template-form' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <FormTextField
                  name='code'
                  label={shiftUiCopy.templates.codeLabel}
                  required
                  placeholder={shiftUiCopy.templates.codePlaceholder}
                />
                <FormTextField
                  name='name'
                  label={shiftUiCopy.templates.nameLabel}
                  required
                  placeholder={shiftUiCopy.templates.namePlaceholder}
                />
                <form.AppField name='startTime'>
                  {(field) => (
                      <field.Field>
                        <field.FieldLabel>{shiftUiCopy.templates.startTimeLabel}</field.FieldLabel>
                      <field.FieldContent>
                        <Input
                          type='time'
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                      </field.FieldContent>
                      <field.FieldError />
                    </field.Field>
                  )}
                </form.AppField>
                <form.AppField name='endTime'>
                  {(field) => (
                      <field.Field>
                        <field.FieldLabel>{shiftUiCopy.templates.endTimeLabel}</field.FieldLabel>
                      <field.FieldContent>
                        <Input
                          type='time'
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                        />
                      </field.FieldContent>
                      <field.FieldError />
                    </field.Field>
                  )}
                </form.AppField>
              </div>

              <form.AppField name='activeWeekdays'>
                {(field) => (
                  <field.Field>
                    <field.FieldLabel>{shiftUiCopy.templates.activeWeekdaysLabel}</field.FieldLabel>
                    <field.FieldContent>
                      <div className='flex flex-wrap gap-2'>
                        {weekdayOptions.map((option) => {
                          const active = field.state.value.includes(option.value);
                          return (
                            <Button
                              key={option.value}
                              type='button'
                              variant={active ? 'default' : 'outline'}
                              size='sm'
                              onClick={() => {
                                const nextValue = active
                                  ? field.state.value.filter((item) => item !== option.value)
                                  : [...field.state.value, option.value];
                                field.handleChange(nextValue);
                              }}
                            >
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    </field.FieldContent>
                    <field.FieldError />
                  </field.Field>
                )}
              </form.AppField>
            </form.Form>
          </form.AppForm>
        </div>


      </SheetContent>
    </Sheet>
  );
}
