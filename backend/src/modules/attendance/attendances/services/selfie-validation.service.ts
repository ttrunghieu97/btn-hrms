import { Injectable } from "@nestjs/common";

export type SelfieValidationResult =
  | { ok: true; mime: string; width?: number; height?: number }
  | { ok: false; reason: string };

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MIN_DIM = 320;

const ACCEPTED_MIMES = new Set(["image/jpeg", "image/png"]);

/**
 * Cheap, dependency-free selfie validation:
 *   - accepts only JPEG / PNG
 *   - rejects > 2 MB
 *   - peeks at image headers for basic dimension sanity (min 320x320)
 *
 * Face-presence detection is intentionally a separate service
 * (FacePresenceService) so the provider can be swapped.
 */
@Injectable()
export class SelfieValidationService {
  validate(
    buffer: Buffer | undefined,
    declaredMime?: string,
  ): SelfieValidationResult {
    if (!buffer || buffer.length === 0) {
      return { ok: false, reason: "selfie_missing" };
    }
    if (buffer.length > MAX_BYTES) {
      return { ok: false, reason: "selfie_too_large" };
    }

    const sniffed = sniffMime(buffer);
    const mime = sniffed ?? declaredMime ?? "";
    if (!ACCEPTED_MIMES.has(mime)) {
      return { ok: false, reason: "selfie_unsupported_format" };
    }

    const dims = readDimensions(buffer, mime);
    if (dims) {
      if (dims.width < MIN_DIM || dims.height < MIN_DIM) {
        return { ok: false, reason: "selfie_too_small" };
      }
      return { ok: true, mime, width: dims.width, height: dims.height };
    }

    return { ok: true, mime };
  }
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

function readDimensions(
  buf: Buffer,
  mime: string,
): { width: number; height: number } | null {
  try {
    if (mime === "image/png" && buf.length >= 24) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height };
    }
    if (mime === "image/jpeg") {
      // Walk JPEG markers looking for SOF (Start Of Frame).
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        if (marker === undefined) return null;
        const segLen = buf.readUInt16BE(i + 2);
        // SOF0–SOF3 / SOF5–SOF7 / SOF9–SOF11 / SOF13–SOF15
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          const height = buf.readUInt16BE(i + 5);
          const width = buf.readUInt16BE(i + 7);
          return { width, height };
        }
        i += 2 + segLen;
      }
    }
  } catch {
    return null;
  }
  return null;
}



