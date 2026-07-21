import * as React from 'react';
import { toast } from 'sonner';
import { uploadTempFile, type TempUploadPurpose } from '@/features/uploads';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';

export const EMPLOYEE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES: Record<TempUploadPurpose, ReadonlySet<string>> = {
  avatar: new Set(['image/jpeg', 'image/png', 'image/webp']),
  document: new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  certification: new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
};

export function validateEmployeeUpload(file: File, purpose: TempUploadPurpose) {
  if (file.size > EMPLOYEE_UPLOAD_MAX_BYTES) {
    throw new Error('File too large (max 5MB)');
  }

  if (!ALLOWED_UPLOAD_TYPES[purpose].has(file.type)) {
    throw new Error(purpose === 'avatar' ? 'Invalid image format' : 'Invalid file format');
  }
}

export function waitForUploadUiPaint() {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });
}

export interface FieldUploadDeps {
  fieldUploadRequestRef: React.MutableRefObject<Map<string, number>>;
  setFieldUploadKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  draftId: string;
}

export async function stageFieldFile(
  key: string,
  file: File,
  purpose: 'document' | 'certification',
  onUploaded: (uploaded: Awaited<ReturnType<typeof uploadTempFile>>) => void,
  deps: FieldUploadDeps,
) {
  const requestId = (deps.fieldUploadRequestRef.current.get(key) ?? 0) + 1;
  deps.fieldUploadRequestRef.current.set(key, requestId);
  deps.setFieldUploadKeys((current) => new Set(current).add(key));
  try {
    validateEmployeeUpload(file, purpose);
    await waitForUploadUiPaint();
    if (deps.fieldUploadRequestRef.current.get(key) !== requestId) return;
    const uploaded = await uploadTempFile({ file, purpose, draftId: deps.draftId });
    if (deps.fieldUploadRequestRef.current.get(key) !== requestId) return;
    onUploaded(uploaded);
  } catch (error) {
    if (deps.fieldUploadRequestRef.current.get(key) !== requestId) return;
    toast.error(
      error instanceof Error
        ? error.message
        : feedbackCopy.failure.upload(feedbackEntity.file),
    );
  } finally {
    if (deps.fieldUploadRequestRef.current.get(key) === requestId) {
      deps.setFieldUploadKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }
}

export function cancelFieldUpload(
  key: string,
  deps: FieldUploadDeps,
) {
  deps.fieldUploadRequestRef.current.set(
    key,
    (deps.fieldUploadRequestRef.current.get(key) ?? 0) + 1,
  );
  deps.setFieldUploadKeys((current) => {
    if (!current.has(key)) return current;
    const next = new Set(current);
    next.delete(key);
    return next;
  });
}
