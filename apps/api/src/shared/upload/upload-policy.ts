import { UnsupportedMediaTypeException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

const DEFAULT_MAX_UPLOAD_MB = 5;
const DEFAULT_MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;

export const uploadPolicy = {
  maxFileSizeBytes: resolveMaxUploadBytes(),
  mimeTypes: {
    image: ["image/jpeg", "image/png", "image/webp"],
    document: ["application/pdf"],
  },
} as const;

export const uploadPolicyByPurpose = {
  avatar: {
    maxFileSizeBytes: resolveMaxUploadBytes(),
    mimeTypes: uploadPolicy.mimeTypes.image,
  },
  document: {
    maxFileSizeBytes: resolveMaxUploadBytes(),
    mimeTypes: [...uploadPolicy.mimeTypes.image, ...uploadPolicy.mimeTypes.document],
  },
  certification: {
    maxFileSizeBytes: resolveMaxUploadBytes(),
    mimeTypes: [...uploadPolicy.mimeTypes.image, ...uploadPolicy.mimeTypes.document],
  },
} as const;

export function createMemoryFileInterceptor(
  fieldName: string,
  allowedMimeTypes: readonly string[],
  maxFileSizeBytes: number = uploadPolicy.maxFileSizeBytes,
) {
  return FileInterceptor(fieldName, {
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new UnsupportedMediaTypeException("Unsupported file type"),
          false,
        );
      }
      return cb(null, true);
    },
    storage: memoryStorage(),
  });
}

export async function validateFileMagicBytes(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<void> {
  // Dynamic import: file-type v19+ is ESM-only, SWC outputs CJS
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    // File type unrecognizable — reject
    throw new UnsupportedMediaTypeException(
      `File type could not be detected. Declared: ${declaredMimeType}`,
    );
  }

  if (detected.mime !== declaredMimeType) {
    throw new UnsupportedMediaTypeException(
      `File type mismatch: declared "${declaredMimeType}" but actual file type is "${detected.mime}" (${detected.ext})`,
    );
  }

  // Also check against allowed set: the caller should verify declared mime is in
  // the purpose whitelist (multer fileFilter does this). Magic byte check ensures
  // the declared mime matches the actual content.
}

function resolveMaxUploadBytes() {
  const maxUploadMb = Number(process.env.UPLOAD_MAX_MB || DEFAULT_MAX_UPLOAD_MB);
  return Number.isFinite(maxUploadMb)
    ? maxUploadMb * 1024 * 1024
    : DEFAULT_MAX_UPLOAD_BYTES;
}
