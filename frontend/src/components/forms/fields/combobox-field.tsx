'use client';

import * as React from 'react';
import { useStore } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FieldDescription, FieldLabel } from '@/components/ui/field';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import {
  useFieldContext,
  FormFieldSet,
  FormField,
  FormFieldError,
  createFormField
} from '@/components/ui/form-context';

type Option = { value: string; label: string };

interface ComboboxFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

export function ComboboxField({
  label,
  description,
  required,
  options,
  placeholder = commonUiCopy.selectOption,
  searchPlaceholder = commonUiCopy.search,
  emptyMessage = commonUiCopy.noResults
}: ComboboxFieldProps) {
  const field = useFieldContext();
  const isTouched = useStore(field.store, (s) => s.meta.isTouched);
  const isValid = useStore(field.store, (s) => s.meta.isValid);
  const value = useStore(field.store, (s) => s.value) as string;
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const term = normalize(search);
    return options.filter((opt) => normalize(opt.label).includes(term));
  }, [options, search]);

  return (
    <FormFieldSet>
      <FormField>
        <FieldLabel htmlFor={field.name}>
          {label}
          {required && ' *'}
        </FieldLabel>
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              aria-invalid={isTouched && !isValid}
              className='w-full justify-between font-normal'
              onBlur={() => field.handleBlur()}
            >
              {selected?.label ?? placeholder}
              <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {filtered.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => {
                        field.handleChange(opt.value);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <Icons.check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === opt.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FormField>
      <FormFieldError />
    </FormFieldSet>
  );
}

export const FormComboboxField = createFormField(ComboboxField);
