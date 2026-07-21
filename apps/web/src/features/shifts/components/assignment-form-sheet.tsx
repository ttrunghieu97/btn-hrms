'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { employeesQueryOptions } from '@/features/employees';
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
  AlertDialogTitle
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
  type CancelEmployeeShiftAssignmentDto,
  type CreateEmployeeShiftAssignmentDto,
} from '@/api/generated/model';
import { ApiError } from '@/lib/api-error';
import { matchesBackendError } from '@/lib/error-contract-registry';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  cancelShiftAssignmentMutation,
  createShiftAssignmentMutation,
  updateShiftAssignmentMutation
} from '../api/mutations';
import { shiftsTemplatesQueryOptions, type ShiftAssignmentRow } from '../api/queries';
import {
  cancelShiftAssignmentFormSchema,
  shiftAssignmentFormSchema,
  type CancelShiftAssignmentFormValues,
  type ShiftAssignmentFormValues
} from '../schemas/shift-form.schema';

interface AssignmentFormSheetProps {
  assignment?: ShiftAssignmentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancelTarget?: ShiftAssignmentRow;
  onCancelTargetChange?: (assignment: ShiftAssignmentRow | undefined) => void;
}

function getAssignmentDefaults(
  assignment?: ShiftAssignmentRow
): ShiftAssignmentFormValues {
  return {
    employeeId: assignment?.employeeId ?? '',
    shiftTemplateId: assignment?.shiftTemplateId ?? '',
    effectiveFrom: assignment?.effectiveFrom ?? '',
    effectiveTo: assignment?.effectiveTo ?? '',
    note: assignment?.note ?? ''
  };
}

function getCancelDefaults(
  cancelTarget?: ShiftAssignmentRow,
  assignment?: ShiftAssignmentRow
): CancelShiftAssignmentFormValues {
  return {
    cancelFrom: cancelTarget?.effectiveFrom ?? assignment?.effectiveFrom ?? '',
    reason: ''
  };
}

export function AssignmentFormSheet({
  assignment,
  open,
  onOpenChange,
  cancelTarget,
  onCancelTargetChange
}: AssignmentFormSheetProps) {
  const isEdit = Boolean(assignment);
  const [cancelFormValues, setCancelFormValues] =
    useState<CancelShiftAssignmentFormValues>(getCancelDefaults(cancelTarget, assignment));

  const templatesQuery = useQuery(shiftsTemplatesQueryOptions({ page: 1, limit: 100 }));

  const createMutation = useMutation({
    ...createShiftAssignmentMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.assigned(feedbackEntity.assignment));
      onOpenChange(false);
    },
    onError: (err) => {
      if (matchesBackendError(err, 'SCHEDULE_LOCKED')) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.warning.rosterLocked));
        if (err instanceof ApiError) err.toastShown = true;
        return;
      }

      toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.failure.assign(feedbackEntity.assignment)));
      if (err instanceof ApiError) err.toastShown = true;
    }
  });

  const updateMutation = useMutation({
    ...updateShiftAssignmentMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.updated(feedbackEntity.assignment));
      onOpenChange(false);
    },
    onError: (err) => {
      if (matchesBackendError(err, 'SCHEDULE_LOCKED')) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.warning.rosterLocked));
        if (err instanceof ApiError) err.toastShown = true;
        return;
      }

      toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.failure.update(feedbackEntity.assignment)));
      if (err instanceof ApiError) err.toastShown = true;
    }
  });

  const cancelMutation = useMutation({
    ...cancelShiftAssignmentMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.cancelled(feedbackEntity.assignment));
      onCancelTargetChange?.(undefined);
      setCancelFormValues(getCancelDefaults(undefined, assignment));
    },
    onError: (err) => {
      if (matchesBackendError(err, 'SCHEDULE_LOCKED')) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.warning.rosterLocked));
        if (err instanceof ApiError) err.toastShown = true;
        return;
      }

      if (matchesBackendError(err, 'SCHEDULE_CONFLICT')) {
        toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.warning.scheduleConflict));
        if (err instanceof ApiError) err.toastShown = true;
        return;
      }

      toast.error(getVietnameseApiErrorMessage(err, feedbackCopy.failure.processRequest));
      if (err instanceof ApiError) err.toastShown = true;
    }
  });

  const form = useAppForm({
    defaultValues: getAssignmentDefaults(assignment),
    validators: {
      onSubmit: shiftAssignmentFormSchema
    },
    onSubmit: async ({ value }) => {
      const basePayload = {
        employeeId: value.employeeId.trim(),
        shiftTemplateId: value.shiftTemplateId,
        effectiveFrom: value.effectiveFrom,
        effectiveTo: value.effectiveTo || undefined,
        note: value.note?.trim() || undefined
      };

      try {
        if (isEdit && assignment?.id) {
          await updateMutation.mutateAsync({
            id: assignment.id,
            payload: basePayload,
          });
          return;
        }

        await createMutation.mutateAsync(basePayload);
      } catch {
        // onError handles toast
      }
    }
  });

  useEffect(() => {
    form.reset(getAssignmentDefaults(assignment));
  }, [assignment]);

  useEffect(() => {
    setCancelFormValues(getCancelDefaults(cancelTarget, assignment));
  }, [cancelTarget, assignment]);

  const cancelForm = useAppForm({
    defaultValues: cancelFormValues,
    validators: {
      onSubmit: cancelShiftAssignmentFormSchema
    },
    onSubmit: async ({ value }) => {
      if (!cancelTarget) return;

      try {
        await cancelMutation.mutateAsync({
          id: cancelTarget.id,
          payload: {
            cancelFrom: value.cancelFrom,
            reason: value.reason?.trim() || undefined
          } satisfies CancelEmployeeShiftAssignmentDto
        });
      } catch {
        // onError handles toast
      }
    }
  });

  useEffect(() => {
    cancelForm.reset(cancelFormValues);
  }, [cancelFormValues]);

  const { FormTextField, FormSelectField, FormComboboxField } = useFormFields<ShiftAssignmentFormValues>();
  const cancelFields = useFormFields<CancelShiftAssignmentFormValues>();

  const employeesQuery = useQuery(employeesQueryOptions({ limit: 500 }));

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data?.employees ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName}${emp.employeeCode ? ` (${emp.employeeCode})` : ''}`.trim()
      })),
    [employeesQuery.data?.employees]
  );

  const templateOptions = useMemo(
    () =>
      (templatesQuery.data?.templates ?? []).map((template) => ({
        value: template.id,
        label: `${template.name} (${template.code})`
      })),
    [templatesQuery.data?.templates]
  );

  const isPending =
    createMutation.isPending || updateMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='flex flex-col sm:max-w-xl'>
          <SheetHeader className='flex flex-row items-start justify-between border-b pb-4 space-y-0'>
            <div>
              <SheetTitle>
                {isEdit ? shiftUiCopy.assignments.editTitle : shiftUiCopy.assignments.createTitle}
              </SheetTitle>
              <SheetDescription>
                {isEdit
                  ? shiftUiCopy.assignments.editDescription
                  : shiftUiCopy.assignments.createDescription}
              </SheetDescription>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)} disabled={isPending}>
                {commonUiCopy.cancel}
              </Button>
              <Button type='submit' form='shift-assignment-form' size='sm' isLoading={isPending}>
                <Icons.check className='mr-1 h-4 w-4' />
                {isEdit ? commonUiCopy.saveChanges : shiftUiCopy.assignments.createAction}
              </Button>
            </div>
          </SheetHeader>

          <div className='flex-1 overflow-auto'>
            <form.AppForm>
              <form.Form id='shift-assignment-form' className='space-y-4'>
                <FormComboboxField
                  name='employeeId'
                  label={shiftUiCopy.assignments.employeeLabel}
                  required
                  options={employeeOptions}
                  placeholder={shiftUiCopy.assignments.employeePlaceholder}
                  searchPlaceholder={commonUiCopy.searchByName}
                  emptyMessage={commonUiCopy.noEmployeesFound}
                />
                <FormSelectField
                  name='shiftTemplateId'
                  label={shiftUiCopy.assignments.templateLabel}
                  required
                  placeholder={shiftUiCopy.assignments.templatePlaceholder}
                  options={templateOptions}
                />
                <div className='grid gap-4 md:grid-cols-2'>
                  <form.AppField name='effectiveFrom'>
                    {(field) => (
                      <field.Field>
                        <field.FieldLabel>{shiftUiCopy.assignments.effectiveFromLabel}</field.FieldLabel>
                        <field.FieldContent>
                          <Input
                            type='date'
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        </field.FieldContent>
                        <field.FieldError />
                      </field.Field>
                    )}
                  </form.AppField>
                  <form.AppField name='effectiveTo'>
                    {(field) => (
                      <field.Field>
                        <field.FieldLabel>{shiftUiCopy.assignments.effectiveToLabel}</field.FieldLabel>
                        <field.FieldContent>
                          <Input
                            type='date'
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                          />
                        </field.FieldContent>
                        <field.FieldError />
                      </field.Field>
                    )}
                  </form.AppField>
                </div>
<FormTextField
                  name='note'
                  label={shiftUiCopy.assignments.noteLabel}
                  placeholder={shiftUiCopy.assignments.notePlaceholder}
                />
              </form.Form>
            </form.AppForm>
          </div>


        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onCancelTargetChange?.(undefined);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{shiftUiCopy.assignments.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {shiftUiCopy.assignments.cancelDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <cancelForm.AppForm>
            <cancelForm.Form id='cancel-shift-assignment-form' className='space-y-4 p-0'>
              <cancelForm.AppField name='cancelFrom'>
                {(field) => (
                  <field.Field>
                    <field.FieldLabel>{shiftUiCopy.assignments.cancelFromLabel}</field.FieldLabel>
                    <field.FieldContent>
                      <Input
                        type='date'
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    </field.FieldContent>
                    <field.FieldError />
                  </field.Field>
                )}
              </cancelForm.AppField>
              <cancelFields.FormTextField
                name='reason'
                label={shiftUiCopy.assignments.cancelReasonLabel}
                placeholder={shiftUiCopy.assignments.cancelReasonPlaceholder}
              />
            </cancelForm.Form>
          </cancelForm.AppForm>
          <AlertDialogFooter>
            <AlertDialogCancel>{shiftUiCopy.assignments.close}</AlertDialogCancel>
            <Button
              type='submit'
              form='cancel-shift-assignment-form'
              isLoading={cancelMutation.isPending}
            >
              {shiftUiCopy.assignments.confirmCancel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
