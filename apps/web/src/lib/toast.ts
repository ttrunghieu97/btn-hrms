/**
 * Toast helper — standardized wrapper around sonner toast.
 *
 * Usage:
 *   showToast.success('Employee created')
 *   showToast.error('Failed to save', { description: error.message })
 *   showToast.promise(saveFn, { loading: 'Saving...', success: 'Saved!', error: 'Failed' })
 */
import { toast } from 'sonner';

type ToastOptions = Parameters<typeof toast>[1];

export const showToast = {
  success(msg: string, opts?: ToastOptions) {
    toast.success(msg, { duration: 3000, ...opts });
  },
  error(msg: string, opts?: ToastOptions) {
    toast.error(msg, { duration: 5000, ...opts });
  },
  warning(msg: string, opts?: ToastOptions) {
    toast.warning(msg, { duration: 4000, ...opts });
  },
  info(msg: string, opts?: ToastOptions) {
    toast.info(msg, { duration: 3000, ...opts });
  },
  promise<T>(promise: Promise<T>, messages?: { loading?: string; success?: string; error?: string }): Promise<T> {
    toast.promise(promise, messages);
    return promise;
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
