'use client';

import { useState } from 'react';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { commonUiCopy, userUiCopy } from '@/lib/app-copy';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useMutation } from '@tanstack/react-query';
import { createUserMutation, updateUserMutation } from '../api/mutations';
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

function splitDisplayName(name?: string) {
  if (!name) return { firstName: '', lastName: '' };

  const [firstName, ...rest] = name.trim().split(' ');
  return {
    firstName: firstName ?? '',
    lastName: rest.join(' ')
  };
}

function getUsername(user?: User) {
  return user?.username || null;
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

  const updateMutation = useMutation({
    ...updateUserMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.updated(feedbackEntity.user));
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Forbidden') {
        toast.error(feedbackCopy.warning.accessDenied(userUiCopy.actions.update));
        if (error instanceof ApiError) error.toastShown = true;
      }
    }
  });

  const { firstName, lastName } = splitDisplayName(user?.employeeUsername || user?.username);

  const form = useAppForm({
    defaultValues: {
      firstName,
      lastName,
      email: user?.email ?? '',
      phoneNumber: ''
    } as UserFormValues,
    validators: {
      onSubmit: userSchema
    },
    onSubmit: async ({ value }) => {
      const payload = {
        firstName: value.firstName,
        lastName: value.lastName,
        ...(value.email ? { email: value.email } : {}),
        ...(value.phoneNumber ? { phoneNumber: value.phoneNumber } : {})
      };

      try {
        if (isEdit) {
          const username = getUsername(user);
          if (!username) {
            toast.error(feedbackCopy.warning.missingUsername('chinh sua', feedbackEntity.user));
            return;
          }

          await updateMutation.mutateAsync({ id: username, values: payload });
          return;
        }

        await createMutation.mutateAsync(payload);
      } catch {
        // onError handles toast
      }
    }
  });

  const { FormTextField } = useFormFields<UserFormValues>();

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <Button type='submit' form='user-form-sheet' size='sm' isLoading={isPending}>
              <Icons.check className='mr-1 h-4 w-4' /> {isEdit ? commonUiCopy.saveChanges : userUiCopy.createUser}
            </Button>
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
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
