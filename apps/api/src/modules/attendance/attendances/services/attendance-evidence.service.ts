import { Injectable } from "@nestjs/common";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { MetricsService } from "../../../../shared/metrics/metrics.service";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { SelfieValidationService } from "./selfie-validation.service";
import { FACE_DETECTION_PORT, type FaceDetectionPort } from "../ports/face-detection.port";
import { EVIDENCE_STORAGE_PORT, type EvidenceStoragePort } from "../ports/evidence-storage.port";
import { Inject } from "@nestjs/common";
import { RequestContextService } from "../../../../shared/context/request-context.service";

export type EvidenceInput = {
  employeeId: string;
  buffer: Buffer;
  mime: string;
  uploadedBy?: string;
};

export type EvidenceResult = {
  s3Key: string;
  url: string;
  facePresent: boolean;
  verificationStatus: "verified" | "flagged" | "rejected";
};

@Injectable()
export class AttendanceEvidenceService {
  private readonly logger: ContextLogger;

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly selfieValidation: SelfieValidationService,
    @Inject(FACE_DETECTION_PORT)
    private readonly faceDetection: FaceDetectionPort,
    @Inject(EVIDENCE_STORAGE_PORT)
    private readonly storage: EvidenceStoragePort,
    private readonly metrics: MetricsService,
  ) {
    this.logger = new ContextLogger(requestContext, AttendanceEvidenceService.name);
  }

  async process(input: EvidenceInput): Promise<EvidenceResult> {
    const t0 = performance.now();
    const userId = this.requestContext.get()?.userId ?? input.uploadedBy ?? input.employeeId;

    // 1. Validate image integrity
    const validation = this.selfieValidation.validate(input.buffer, input.mime);
    if (!validation.ok) {
      throwBadRequest(
        `Selfie rejected: ${validation.reason}`,
        ERROR_CODES.SELFIE_REJECTED,
        { reason: validation.reason },
      );
    }
    this.metrics.observeAttendanceVerificationStep("selfie_validate", "ok", performance.now() - t0);

    // 2. Face presence detection
    const tFace = performance.now();
    const faceResult = await this.faceDetection.detect({
      buffer: input.buffer,
      mime: validation.mime,
    });
    this.metrics.observeAttendanceVerificationStep("face_detect", faceResult.facePresent ? "ok" : "no_face", performance.now() - tFace);

    const verificationStatus: "verified" | "flagged" | "rejected" =
      faceResult.facePresent ? "verified" : "flagged";

    // 3. Upload evidence
    const tUpload = performance.now();
    const stored = await this.storage.store({
      employeeId: input.employeeId,
      buffer: input.buffer,
      mime: validation.mime,
      uploadedBy: userId,
    });
    this.metrics.observeAttendanceUploadDuration("selfie", performance.now() - tUpload);

    this.logger.log("evidence_processed", {
      employeeId: input.employeeId,
      facePresent: faceResult.facePresent,
      verificationStatus,
      key: stored.key,
    });

    return {
      s3Key: stored.key,
      url: stored.url,
      facePresent: faceResult.facePresent,
      verificationStatus,
    };
  }
}
