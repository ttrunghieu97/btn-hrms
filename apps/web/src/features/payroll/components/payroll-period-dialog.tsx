'use client';

import { useEffect } from 'react';
import { useAppForm } from '@/components/ui/tanstack-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createPayrollPeriodSchema } from '../schemas/payroll-period-schema';
import type { PayrollPeriod, CreatePayrollPeriodPayload } from '../types';

type FormValues = {
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  payDate: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: CreatePayrollPeriodPayload) => void;
  editing?: PayrollPeriod | null;
  saving?: boolean;
}

export function PayrollPeriodDialog({ open, onOpenChange, onSave, editing, saving }: Props) {
  const form = useAppForm({
    defaultValues: {
      code: '',
      name: '',
      startsOn: '',
      endsOn: '',
      payDate: '',
    } as FormValues,
    validators: { onSubmit: createPayrollPeriodSchema },
    onSubmit: ({ value }) => {
      const payload: CreatePayrollPeriodPayload = {
        code: value.code,
        name: value.name,
        startsOn: value.startsOn,
        endsOn: value.endsOn,
        payDate: value.payDate || undefined,
      };
      onSave(payload);
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldValue('code', editing.code);
      form.setFieldValue('name', editing.name);
      form.setFieldValue('startsOn', editing.startsOn);
      form.setFieldValue('endsOn', editing.endsOn);
      form.setFieldValue('payDate', editing.payDate ?? '');
    } else {
      form.reset();
    }
  }, [editing, open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa kỳ lương' : 'Thêm kỳ lương'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Cập nhật thông tin kỳ lương' : 'Tạo kỳ lương mới'}
          </DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <form.AppField name='code'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Mã kỳ lương</field.FieldLabel>
                    <field.Field>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder='P2025-01'
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              </form.AppField>

              <form.AppField name='name'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Tên kỳ lương</field.FieldLabel>
                    <field.Field>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder='Kỳ lương tháng 1/2025'
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              </form.AppField>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <form.AppField name='startsOn'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Bắt đầu</field.FieldLabel>
                    <field.Field>
                      <Input
                        type='date'
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              </form.AppField>

              <form.AppField name='endsOn'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Kết thúc</field.FieldLabel>
                    <field.Field>
                      <Input
                        type='date'
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              </form.AppField>

              <form.AppField name='payDate'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Ngày trả</field.FieldLabel>
                    <field.Field>
                      <Input
                        type='date'
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              </form.AppField>
            </div>

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
