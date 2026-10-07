export type UploadFieldStatus =
  | 'empty'
  | 'existing'
  | 'uploading'
  | 'uploaded'
  | 'removing'
  | 'error';

export interface UploadFieldState {
  status: UploadFieldStatus;
  previewUrl?: string;
  fileName?: string;
  attachmentId?: string;
  tempFileToken?: string;
  tempFileId?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
}

export interface TempUploadResult {
  tempFileToken: string;
  tempFileId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
