'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppForm } from '@/components/ui/tanstack-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Icons } from '@/components/icons';
import { Spinner } from '@/components/ui/spinner';
import * as z from 'zod';
import { salaryStructureSchema, PAY_FREQUENCY_OPTIONS } from '../schemas/salary-structure-schema';
import { toCreatePayload } from '../api/salary-structure-mapper';
import { useEmployeeSearchQuery } from '../queries/employee-queries';
import type { CreateSalaryStructurePayload } from '../types';

type FormValues = z.infer<typeof salaryStructureSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: CreateSalaryStructurePayload) => void;
  saving?: boolean;
}

export function SalaryStructureDialog({ open, onOpenChange, onSave, saving }: Props) {
  const form = useAppForm({
    defaultValues: {
      employeeId: '',
      payFrequency: 'monthly',
      baseSalary: '',
      currency: 'VND',
      effectiveFrom: '',
      effectiveTo: '',
      isCurrent: true,
    } as FormValues,
    validators: { onSubmit: salaryStructureSchema },
    onSubmit: ({ value }) => {
      onSave(toCreatePayload(value));
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Thêm cấu trúc lương</DialogTitle>
          <DialogDescription>
            Tạo cấu trúc lương mới cho nhân viên
          </DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form className='space-y-4'>
            <form.AppField name='employeeId'>
              {(field) => (
                <field.FieldSet>
                  <field.FieldLabel>Nhân viên</field.FieldLabel>
                  <field.Field>
                    <EmployeeSearchSelect
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </form.AppField>

            <form.AppField name='payFrequency'>
              {(field) => (
                <field.FieldSet>
                  <field.FieldLabel>Kỳ trả lương</field.FieldLabel>
                  <field.Field>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as FormValues['payFrequency'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAY_FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </form.AppField>

            <form.AppField name='baseSalary'>
              {(field) => (
                <field.FieldSet>
                  <field.FieldLabel>Lương cơ bản</field.FieldLabel>
                  <field.Field>
                    <Input
                      type='number'
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder='0'
                    />
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            </form.AppField>

            <div className='grid grid-cols-2 gap-4'>
              <form.AppField name='effectiveFrom'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Hiệu lực từ</field.FieldLabel>
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

              <form.AppField name='effectiveTo'>
                {(field) => (
                  <field.FieldSet>
                    <field.FieldLabel>Hiệu lực đến</field.FieldLabel>
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
                      {saving ? 'Đang lưu...' : 'Tạo mới'}
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

function EmployeeSearchSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data: employees = [], isLoading } = useEmployeeSearchQuery(debouncedSearch);

  const selected = employees.find((e) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
        >
          {selected ? `${selected.name} (${selected.code})` : 'Chọn nhân viên...'}
          <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
        <Command shouldFilter={false}>
          <CommandInput placeholder='Tìm nhân viên...' value={search} onValueChange={setSearch} />
          <CommandList>
            {isLoading ? (
              <div className='flex items-center justify-center py-6'>
                <Spinner />
              </div>
            ) : (
              <>
                <CommandEmpty>Không tìm thấy nhân viên</CommandEmpty>
                <CommandGroup>
                  {employees.map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={emp.id}
                      onSelect={() => {
                        onChange(emp.id);
                        setOpen(false);
                      }}
                    >
                      {emp.name} ({emp.code})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
