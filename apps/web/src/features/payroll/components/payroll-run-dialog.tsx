'use client';

import { useEffect } from 'react';
import { useAppForm } from '@/components/ui/tanstack-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createPayrollRunSchema } from '../schemas/payroll-run-schema';
import { usePayrollPeriodsQuery } from '../queries/period-queries';
import type { PayrollRun, CreatePayrollRunPayload } from '../types';

type FormValues = {
  payrollPeriodId: string;
  notes: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: CreatePayrollRunPayload) => void;
  editing?: PayrollRun | null;
  saving?: boolean;
}

export function PayrollRunDialog({ open, onOpenChange, onSave, editing, saving }: Props) {
  const { data: periodsData } = usePayrollPeriodsQuery();

  const form = useAppForm({
    defaultValues: {
      payrollPeriodId: '',
      notes: '',
    } as FormValues,
    validators: { onSubmit: createPayrollRunSchema },
    onSubmit: ({ value }) => {
      const payload: CreatePayrollRunPayload = {
        payrollPeriodId: value.payrollPeriodId,
        notes: value.notes || undefined,
      };
      onSave(payload);
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldValue('payrollPeriodId', editing.payrollPeriodId);
      form.setFieldValue('notes', editing.notes ?? '');
    } else {
      form.reset();
    }
  }, [editing, open, form]);

  const periods = periodsData?.rows ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa bảng lương' : 'Tạo bảng lương'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Cập nhật thông tin bảng lương' : 'Tạo bảng lương mới'}
          </DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form className='space-y-4'>
            <form.AppField name='payrollPeriodId'>
              {(field) => (
                <field.FieldSet>
                  <field.FieldLabel>Kỳ lương</field.FieldLabel>
                  <field.Field>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Chọn kỳ lương' />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </form.AppField>

            <form.AppField name='notes'>
              {(field) => (
                <field.FieldSet>
                  <field.FieldLabel>Ghi chú</field.FieldLabel>
                  <field.Field>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder='Ghi chú (không bắt buộc)'
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </form.AppField>

            <div className='flex justify-end gap-3 pt-2'>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => onOpenChange(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type='submit'
                      disabled={isSubmitting || saving}
                      isLoading={saving}
                    >
                      {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
