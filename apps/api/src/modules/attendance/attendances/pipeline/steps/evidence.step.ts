import { Injectable } from "@nestjs/common";
import { throwBadRequest } from "../../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../../shared/constants/error-codes";
import { MetricsService } from "../../../../../shared/metrics/metrics.service";
import type { VerificationStep, StepResult } from "../verification-step.interface";
import type { AttendanceVerificationContext } from "../verification-context";
import { AttendanceEvidenceService } from "../../services/attendance-evidence.service";

@Injectable()
export class EvidenceStep implements VerificationStep {
  readonly name = "evidence";
  constructor(
    private readonly evidenceService: AttendanceEvidenceService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(ctx: AttendanceVerificationContext): Promise<StepResult> {
    const requiresSelfie = ctx.type === "check_in" || ctx.type === "check_out";
    if (!requiresSelfie) return {};

    if (!ctx.selfieBuffer) {
      throwBadRequest("Selfie image is required", ERROR_CODES.SELFIE_MISSING);
    }

    const result = await this.evidenceService.process({
      employeeId: ctx.employeeId,
      buffer: ctx.selfieBuffer,
      mime: ctx.selfieMime ?? "image/jpeg",
      uploadedBy: ctx.uploadedBy ?? ctx.employeeContext?.userId ?? ctx.employeeId,
    });

    ctx.selfieS3Key = result.s3Key;
    ctx.selfieUrl = result.url;
    ctx.verificationStatus = result.verificationStatus;

    if (!result.facePresent) {
      this.metrics.incrementAttendanceFaceFail("low_confidence");
      return { flags: { selfieLowConfidence: true }, verificationStatus: result.verificationStatus };
    }

    return { verificationStatus: result.verificationStatus };
  }
}
