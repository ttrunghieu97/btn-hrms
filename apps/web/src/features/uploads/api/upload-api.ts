import { uploadsControllerUploadTemp } from '@/api/generated/endpoints';
import type { UploadsControllerUploadTempBodyPurpose } from '@/api/generated/model';
import { unwrapData } from '@/lib/api-extract';
import type { TempUploadResult } from '../types/upload-field';

export type TempUploadPurpose = UploadsControllerUploadTempBodyPurpose;

export async function uploadTempFile(params: {
  file: File;
  purpose: TempUploadPurpose;
  draftId: string;
}) {
  const response = await uploadsControllerUploadTemp({
    file: params.file,
    purpose: params.purpose,
    draftId: params.draftId
  });

  return unwrapData<TempUploadResult>(response);
}
