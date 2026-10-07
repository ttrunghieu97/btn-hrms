/**
 * Mutation feedback toast helpers wrapping `sonner`.
 * Maps `ApiError` → user-friendly messages.
 */

import { toast } from 'sonner';
import { ApiError } from './api-error';
import { getVietnameseApiErrorMessage } from './api-error-message';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getVietnameseApiErrorMessage(error, fallback);
}

export function notifyMutationSuccess(message: string) {
  toast.success(message);
}

export function notifyMutationError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    error.toastShown = true;
  }
  toast.error(getApiErrorMessage(error, fallback));
}

export function notifyQueryError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.toastShown) return;
    error.toastShown = true;
  }
  toast.error(getApiErrorMessage(error, fallback));
}

export function notifyMutationLoading(message: string) {
  return toast.loading(message);
}

export function notifyMutationLoadingDone(toastId: string | number, message: string) {
  toast.success(message, { id: toastId });
}

export function notifyMutationLoadingFailed(
  toastId: string | number,
  error: unknown,
  fallback: string
) {
  if (error instanceof ApiError) {
    error.toastShown = true;
  }
  toast.error(getApiErrorMessage(error, fallback), { id: toastId });
}
