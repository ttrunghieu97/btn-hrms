import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { feedbackCopy, feedbackEntity, validationCopy } from '@/lib/feedback-copy';
import { uploadTempFile, type TempUploadPurpose } from '../api/upload-api';
import type { TempUploadResult, UploadFieldState } from '../types/upload-field';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES_BY_PURPOSE: Record<TempUploadPurpose, Set<string>> = {
  avatar: new Set(['image/jpeg', 'image/png', 'image/webp']),
  document: new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  certification: new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
};

export function validateTempUploadFile(file: File, purpose: TempUploadPurpose) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(validationCopy.upload.fileTooLarge);
  }

  if (!ALLOWED_MIME_TYPES_BY_PURPOSE[purpose].has(file.type)) {
    throw new Error(
      purpose === 'avatar'
        ? validationCopy.upload.invalidAvatarFormat
        : validationCopy.upload.invalidDocumentFormat
    );
  }
}

export function buildUploadedFieldState(uploaded: TempUploadResult): UploadFieldState {
  return {
    status: 'uploaded',
    previewUrl: uploaded.url,
    fileName: uploaded.fileName,
    tempFileToken: uploaded.tempFileToken,
    tempFileId: uploaded.tempFileId,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes
  };
}

export function useTempUploadField() {
  return useMutation({
    mutationFn: async (params: {
      file: File;
      purpose: TempUploadPurpose;
      draftId: string;
    }) => {
      validateTempUploadFile(params.file, params.purpose);
      return uploadTempFile(params);
    },
    retry: 2,
    onError: (error: Error) => {
      toast.error(getVietnameseApiErrorMessage(error, feedbackCopy.failure.upload(feedbackEntity.file)));
      if (error instanceof ApiError) error.toastShown = true;
    }
  });
}
