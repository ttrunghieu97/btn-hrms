export function resolveEmployeeAvatarSrc(params: {
  localPreviewUrl?: string | null;
  uploadedPreviewUrl?: string;
  uploadedPreviewLoaded: boolean;
}) {
  if (params.localPreviewUrl && !params.uploadedPreviewLoaded) {
    return params.localPreviewUrl;
  }

  return params.uploadedPreviewUrl ?? params.localPreviewUrl ?? undefined;
}
