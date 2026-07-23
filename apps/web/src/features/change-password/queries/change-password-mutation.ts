'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authControllerChangePassword } from '@/api/generated/endpoints';
import { feedbackCopy } from '@/lib/feedback-copy';
import type { ChangePasswordRequestDto } from '@/api/generated/model';

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

async function changePassword(data: ChangePasswordInput) {
  return authControllerChangePassword(data as ChangePasswordRequestDto);
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success(feedbackCopy.success.passwordChanged);
    }
  });
}
