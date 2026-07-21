import { Injectable } from "@nestjs/common";
import type { FaceDetectionPort, FaceDetectionInput, FaceDetectionResult } from "../ports/face-detection.port";
import { FacePresenceService } from "./face-presence.service";

/**
 * Adapter: FaceDetectionPort → FacePresenceService.
 */
@Injectable()
export class FacePresenceAdapter implements FaceDetectionPort {
  constructor(private readonly facePresence: FacePresenceService) {}

  async detect(input: FaceDetectionInput): Promise<FaceDetectionResult> {
    const result = await this.facePresence.detect(input.buffer, input.mime);
    return { facePresent: result.facePresent, confidence: result.confidence ?? 0 };
  }
}
