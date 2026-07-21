'use client';

import * as z from 'zod';
import { changePasswordUiCopy } from '@/lib/app-copy';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppForm } from '@/components/ui/tanstack-form';
import { validationCopy } from '@/lib/feedback-copy';
import { useChangePasswordMutation } from '../queries/change-password-mutation';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: validationCopy.changePassword.currentRequired
    }),
    newPassword: z.string().min(10, {
      message: validationCopy.changePassword.newMin10
    }),
    confirmPassword: z.string().min(10, {
      message: validationCopy.changePassword.confirmRequired
    })
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: validationCopy.changePassword.confirmMismatch
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: validationCopy.changePassword.mustDiffer
  });

export default function ChangePasswordPage() {
  const changePasswordMutation = useChangePasswordMutation();

  const form = useAppForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validators: {
      onSubmit: changePasswordSchema
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await changePasswordMutation.mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword
        });
        formApi.reset();
      } catch {
        // onError handles toast
      }
    }
  });

  return (
    <div className='mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]'>
      <section className='rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm md:p-6'>
        <form.AppForm>
          <form.Form className='space-y-6 p-0'>
            <div className='space-y-1'>
              <h2 className='text-xl font-semibold'>{changePasswordUiCopy.title}</h2>
              <p className='text-muted-foreground text-sm leading-6'>
                {changePasswordUiCopy.description}
              </p>
            </div>

            <div className='grid gap-5'>
              <form.AppField
                name='currentPassword'
                children={(field) => (
                  <field.FieldSet>
                    <field.Field>
                      <field.FieldLabel htmlFor={field.name}>
                        {changePasswordUiCopy.currentPasswordLabel}
                      </field.FieldLabel>
                      <Input
                        id={field.name}
                        type='password'
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={changePasswordUiCopy.currentPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className='h-11'
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />
              <form.AppField
                name='newPassword'
                children={(field) => (
                  <field.FieldSet>
                    <field.Field>
                      <field.FieldLabel htmlFor={field.name}>
                        {changePasswordUiCopy.newPasswordLabel}
                      </field.FieldLabel>
                      <Input
                        id={field.name}
                        type='password'
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={changePasswordUiCopy.newPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className='h-11'
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />
              <form.AppField
                name='confirmPassword'
                children={(field) => (
                  <field.FieldSet>
                    <field.Field>
                      <field.FieldLabel htmlFor={field.name}>
                        {changePasswordUiCopy.confirmPasswordLabel}
                      </field.FieldLabel>
                      <Input
                        id={field.name}
                        type='password'
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={changePasswordUiCopy.confirmPasswordPlaceholder}
                        disabled={changePasswordMutation.isPending}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className='h-11'
                      />
                    </field.Field>
                    <field.FieldError />
                  </field.FieldSet>
                )}
              />
            </div>

            <div className='flex justify-end'>
              <Button
                type='submit'
                className='min-w-40'
                isLoading={changePasswordMutation.isPending}
              >
                {changePasswordUiCopy.submitAction}
              </Button>
            </div>
          </form.Form>
        </form.AppForm>
      </section>

      <aside className='space-y-4'>
        <div className='rounded-3xl border border-border/60 bg-muted/25 p-5'>
          <div className='mb-3 flex items-center gap-3'>
            <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-2xl'>
              <Icons.lock className='size-5' />
            </div>
            <div>
              <h3 className='font-semibold'>{changePasswordUiCopy.securityTitle}</h3>
              <p className='text-muted-foreground text-sm'>
                {changePasswordUiCopy.securityDescription}
              </p>
            </div>
          </div>
          <ul className='text-muted-foreground space-y-3 text-sm leading-6'>
            {changePasswordUiCopy.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
