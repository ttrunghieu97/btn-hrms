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

import { IconUser, IconLock, IconEye, IconEyeOff, IconInfoCircle } from '@tabler/icons-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export default function UserAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const loading = useAuthStore((state) => state.loading);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const form = useAppForm({
    defaultValues: {
      username: '',
      password: ''
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
            setSubmitError(getVietnameseApiErrorMessage(error, 'Đăng nhập không thành công'));
            return;
          }

          throw error;
        }
      }
  });

  return (
    <TooltipProvider>
      <div className='space-y-6'>
        {isDemoMode ? (
          <div className='flex flex-wrap items-center gap-2 rounded-lg border border-[oklch(0.88_0.02_40)] bg-[oklch(0.97_0.01_40)] px-3.5 py-2.5 text-xs text-[oklch(0.35_0.02_40)] dark:border-[oklch(0.28_0.02_40)] dark:bg-[oklch(0.19_0.02_40)] dark:text-[oklch(0.80_0.02_40)]'>
            <Badge variant='outline' className='font-mono text-[10px] uppercase tracking-wider border-[oklch(0.80_0.03_40)] dark:border-[oklch(0.35_0.03_40)]'>
              {appCopy.auth.signIn.form.demoBadge}
            </Badge>
            <span>{appCopy.auth.signIn.form.demoHelp}</span>
          </div>
        ) : null}
        <form.AppForm>
          <form.Form className='w-full space-y-4'>
            {submitError ? (
              <div role='alert' className='rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive transition-all'>
                {submitError}
              </div>
            ) : null}
            <form.AppField
              name='username'
              children={(field) => (
                <field.FieldSet>
                  <field.Field>
                    <div className='flex items-center justify-between'>
                      <field.FieldLabel htmlFor={field.name} className='font-mono text-xs uppercase tracking-wider text-white/60'>
                        {appCopy.auth.signIn.form.username}
                      </field.FieldLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type='button' tabIndex={-1} className='text-white/40 hover:text-white transition-colors'>
                            <IconInfoCircle className='size-3.5' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='text-xs bg-[#1E1E28] border-white/10 text-white'>
                          Nhập tên đăng nhập hoặc email doanh nghiệp đã cấp
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className='relative'>
                      <IconUser className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70' />
                      <Input
                        id={field.name}
                        autoFocus
                        autoComplete="off"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={appCopy.auth.signIn.form.usernamePlaceholder}
                        disabled={loading}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className='h-11 pl-10 border-white/10 bg-white/5 text-sm transition-all focus-visible:ring-1 focus-visible:ring-indigo-500 aria-invalid:border-rose-500/80 aria-invalid:bg-rose-500/5 aria-invalid:focus-visible:ring-rose-500'
                      />
                    </div>
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
                    <div className='flex items-center justify-between'>
                      <field.FieldLabel htmlFor={field.name} className='font-mono text-xs uppercase tracking-wider text-white/60'>
                        {appCopy.auth.signIn.form.password}
                      </field.FieldLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type='button' tabIndex={-1} className='text-white/40 hover:text-white transition-colors'>
                            <IconInfoCircle className='size-3.5' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='text-xs bg-[#1E1E28] border-white/10 text-white'>
                          Nhập mật khẩu tối thiểu 6 ký tự
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className='relative'>
                      <IconLock className='absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70' />
                      <Input
                        id={field.name}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={appCopy.auth.signIn.form.passwordPlaceholder}
                        disabled={loading}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                        className='h-11 pl-10 pr-10 border-white/10 bg-white/5 text-sm transition-all focus-visible:ring-1 focus-visible:ring-indigo-500 aria-invalid:border-rose-500/80 aria-invalid:bg-rose-500/5 aria-invalid:focus-visible:ring-rose-500'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground p-1 transition-colors focus:outline-none'
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <IconEyeOff className='size-4' /> : <IconEye className='size-4' />}
                      </button>
                    </div>
                  </field.Field>
                  <field.FieldError />
                </field.FieldSet>
              )}
            />
          <Button disabled={loading} className='mt-4 h-11 w-full bg-white hover:bg-white/90 text-black text-xs font-semibold uppercase tracking-wider transition-all rounded-xl' type='submit'>
            {loading ? (
              <span className='flex items-center gap-2'>
                <span className='size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
                {appCopy.auth.signIn.form.submitting}
              </span>
            ) : (
              appCopy.auth.signIn.form.submit
            )}
          </Button>
          <div className='relative my-4'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-white/10' />
            </div>
            <div className='relative flex justify-center font-mono text-[10px] uppercase tracking-widest'>
              <span className='bg-[#16161C] px-3 text-white/40'>
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
    </div>
  </TooltipProvider>
  );
}

