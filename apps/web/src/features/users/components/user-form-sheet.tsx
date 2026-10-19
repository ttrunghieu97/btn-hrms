'use client';

import { useState } from 'react';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commonUiCopy, userUiCopy } from '@/lib/app-copy';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useMutation } from '@tanstack/react-query';
import { createUserMutation } from '../api/mutations';
import type { User } from '../api/types';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import * as z from 'zod';
import { userSchema, type UserFormValues } from '../schemas/user';

interface UserFormSheetProps {
  user?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ user, open, onOpenChange }: UserFormSheetProps) {
  const isEdit = !!user;

  const createMutation = useMutation({
    ...createUserMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.created(feedbackEntity.user));
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Forbidden') {
        toast.error(feedbackCopy.warning.accessDenied(userUiCopy.actions.create));
        if (error instanceof ApiError) error.toastShown = true;
      }
    }
  });

  const form = useAppForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: ''
    } as UserFormValues,
    validators: {
      onSubmit: userSchema
    },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        onOpenChange(false);
        return;
      }

      const payload = {
        firstName: value.firstName,
        lastName: value.lastName,
        ...(value.email ? { email: value.email } : {}),
        ...(value.phoneNumber ? { phoneNumber: value.phoneNumber } : {})
      };

      try {
        await createMutation.mutateAsync(payload);
      } catch {
        // onError handles toast
      }
    }
  });

  const { FormTextField } = useFormFields<UserFormValues>();

  const isPending = createMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='flex flex-row items-center justify-between border-b pb-4 space-y-0'>
          <div>
            <SheetTitle>{isEdit ? userUiCopy.editTitle : userUiCopy.createTitle}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? userUiCopy.editDescription
                : userUiCopy.createDescription}
            </SheetDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)} disabled={isPending}>
              {commonUiCopy.cancel}
            </Button>
            {!isEdit && (
              <Button type='submit' form='user-form-sheet' size='sm' isLoading={isPending}>
                <Icons.check className='mr-1 h-4 w-4' /> {userUiCopy.createUser}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          {isEdit && user ? (
            <div className='space-y-4 py-4 text-sm'>
              <div className='rounded-lg border p-4 space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-foreground'>Định danh tài khoản</span>
                  <Badge variant='secondary' className='text-xs'>
                    Chỉ đọc
                  </Badge>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='user-readonly-username'>Tên đăng nhập</Label>
                  <Input
                    id='user-readonly-username'
                    name='username'
                    value={user.username}
                    readOnly
                    disabled
                    aria-readonly='true'
                    className='font-mono bg-muted/50'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='user-readonly-email'>{userUiCopy.emailLabel}</Label>
                  <Input
                    id='user-readonly-email'
                    name='email'
                    type='email'
                    value={user.email ?? ''}
                    placeholder='—'
                    readOnly
                    disabled
                    aria-readonly='true'
                    className='bg-muted/50'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='user-readonly-employee'>Hồ sơ nhân sự liên kết</Label>
                  <Input
                    id='user-readonly-employee'
                    name='employeeUsername'
                    value={user.employeeUsername || 'Chưa liên kết'}
                    readOnly
                    disabled
                    aria-readonly='true'
                    className='bg-muted/50'
                  />
                </div>
              </div>
              <p className='text-muted-foreground text-xs leading-relaxed'>
                Tên đăng nhập và email định danh tài khoản là chỉ đọc (read-only). Thông tin hồ sơ nhân sự (họ tên, số điện thoại, phòng ban) được quản lý riêng tại phân hệ Hồ sơ nhân viên để tránh ghi đè dữ liệu tài khoản. Để thay đổi vai trò hoặc quyền hạn của tài khoản này, vui lòng dùng chức năng Phân quyền.
              </p>
            </div>
          ) : (
            <form.AppForm>
              <form.Form id='user-form-sheet' className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormTextField
                    name='firstName'
                    label={userUiCopy.firstNameLabel}
                    required
                    placeholder={userUiCopy.firstNamePlaceholder}
                    validators={{
                      onBlur: z.string().min(2, userUiCopy.validation.firstNameMin2)
                    }}
                  />
                  <FormTextField
                    name='lastName'
                    label={userUiCopy.lastNameLabel}
                    required
                    placeholder={userUiCopy.lastNamePlaceholder}
                    validators={{
                      onBlur: z.string().min(2, userUiCopy.validation.lastNameMin2)
                    }}
                  />
                </div>

                <FormTextField
                  name='email'
                  label={userUiCopy.emailLabel}
                  type='email'
                  placeholder={userUiCopy.emailPlaceholder}
                  validators={{
                    onBlur: z.string().email(userUiCopy.validation.emailInvalid).optional().or(z.literal(''))
                  }}
                />

                <FormTextField
                  name='phoneNumber'
                  label={userUiCopy.phoneNumberLabel}
                  type='tel'
                  placeholder={userUiCopy.phoneNumberPlaceholder}
                  validators={{
                    onBlur: z.string().optional().or(z.literal(''))
                  }}
                />
              </form.Form>
            </form.AppForm>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function UserFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> {userUiCopy.addUser}
      </Button>
      <UserFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
