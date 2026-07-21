import { Injectable } from "@nestjs/common";

export type FacePresenceResult = {
  /** True if the pipeline is confident a face is present. */
  facePresent: boolean;
  /** 0..1 confidence score; null when provider cannot score. */
  confidence: number | null;
  /** Provider id, e.g. "noop", "rekognition", "vladmandic". */
  provider: string;
};

/**
 * Pluggable face-presence detector.
 *
 * v1 default = no-op heuristic that always reports `facePresent: true`
 * with a null confidence. This keeps the punch pipeline functional in
 * dev/CI without ML dependencies.
 *
 * Production swap-in:
 *   - Bind a provider that calls AWS Rekognition `DetectFaces` or a
 *     local @vladmandic/face-api service, mark `facePresent: false`
 *     with a confidence score, and CheckAttendanceUseCase will set
 *     verification_status='flagged' (not rejected) so HR can review.
 */
@Injectable()
export class FacePresenceService {
  async detect(_buffer: Buffer, _mime: string): Promise<FacePresenceResult> {
    return { facePresent: true, confidence: null, provider: "noop" };
  }
}



