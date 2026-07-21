'use client';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppForm } from '@/components/ui/tanstack-form';
import { loginSchema } from '@/features/auth/schemas/login.schema';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { isUnauthenticatedError } from '@/lib/error-taxonomy';
import { appCopy } from '@/lib/app-copy';
import { useAuthStore } from '@/stores/auth-store';
import { GoogleSsoButton } from './google-sso-button';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function UserAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const loading = useAuthStore((state) => state.loading);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const form = useAppForm({
    defaultValues: {
      username: isDemoMode ? 'admin' : '',
      password: isDemoMode ? '123456' : ''
    },
    validators: {
      onSubmit: loginSchema
    },
      onSubmit: async ({ value }) => {
        setSubmitError(null);

        try {
          const user = await signIn(value.username, value.password);
          if (user) {
            const next = searchParams.get('next');
            if (next) {
              router.replace(next);
              return;
            }

            const canViewDashboard = user.isSuperAdmin || user.permissions?.some(p => p === 'ALL' || p === 'dashboard:view');
            const canViewAttendance = user.permissions?.some(p => p.startsWith('attendance:'));

            if (canViewDashboard) {
              router.replace('/overview');
            } else if (canViewAttendance) {
              router.replace('/attendance');
            } else {
              router.replace('/account/profile');
            }
          }
        } catch (error) {
          if (isUnauthenticatedError(error)) {
            setSubmitError(getVietnameseApiErrorMessage(error, 'Dang nhap khong thanh cong'));
            return;
          }

          throw error;
        }
      }
  });

  return (
    <div className='space-y-6'>
      {isDemoMode ? (
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <Badge variant='secondary' className='rounded-full px-3 py-1'>
            {appCopy.auth.signIn.form.demoBadge}
          </Badge>
          <span className='text-muted-foreground'>{appCopy.auth.signIn.form.demoHelp}</span>
        </div>
      ) : null}
      <form.AppForm>
        <form.Form className='w-full space-y-4'>
          {submitError ? (
            <div role='alert' className='bg-destructive/10 text-destructive rounded-md border p-3 text-sm'>
              {submitError}
            </div>
          ) : null}
          <form.AppField
            name='username'
            children={(field) => (
              <field.FieldSet>
                <field.Field>
                  <field.FieldLabel htmlFor={field.name}>{appCopy.auth.signIn.form.username}</field.FieldLabel>
                  <Input
                    id={field.name}
                    autoComplete="username"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={appCopy.auth.signIn.form.usernamePlaceholder}
                    disabled={loading}
                    aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    className='h-11'
                  />
                </field.Field>
                <field.FieldError />
              </field.FieldSet>
            )}
          />
          <form.AppField
            name='password'
            children={(field) => (
              <field.FieldSet>
                <field.Field>
                  <field.FieldLabel htmlFor={field.name}>{appCopy.auth.signIn.form.password}</field.FieldLabel>
                  <Input
                    id={field.name}
                    type='password'
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={appCopy.auth.signIn.form.passwordPlaceholder}
                    disabled={loading}
                    aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    className='h-11'
                  />
                </field.Field>
                <field.FieldError />
              </field.FieldSet>
            )}
          />
          <div className='flex items-center justify-between gap-3 pt-1 text-sm'>
            <span className='text-muted-foreground'>{appCopy.auth.signIn.form.sessionPolicy}</span>
            <Link href='/auth/sign-up' className='font-medium underline-offset-4 hover:underline'>
              {appCopy.auth.signIn.form.requestAccess}
            </Link>
          </div>
          <Button disabled={loading} className='mt-2 h-11 w-full' type='submit'>
            {loading ? appCopy.auth.signIn.form.submitting : appCopy.auth.signIn.form.submit}
          </Button>
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t' />
            </div>
            <div className='relative flex justify-center text-xs uppercase'>
              <span className='bg-background text-muted-foreground px-2'>
                {appCopy.auth.signIn.form.orContinueWith}
              </span>
            </div>
          </div>
          <GoogleSsoButton
            onSuccess={async (idToken) => {
              try {
                const user = await signInWithGoogle(idToken);
                if (user) {
                  router.replace('/overview');
                }
              } catch (error) {
                setSubmitError(getVietnameseApiErrorMessage(error, 'Đăng nhập Google thất bại'));
              }
            }}
          />
        </form.Form>
      </form.AppForm>
      <div className='space-y-3'>
        <Separator />
        <div className='rounded-2xl border bg-muted/35 p-4'>
          <p className='text-sm font-medium'>{appCopy.auth.signIn.form.accessPolicyTitle}</p>
          <p className='text-muted-foreground mt-1 text-sm leading-6'>
            {appCopy.auth.signIn.form.accessPolicyDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
