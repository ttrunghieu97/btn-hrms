import { Injectable } from "@nestjs/common";
import type { VerificationStep, StepResult } from "./verification-step.interface";
import type { AttendanceVerificationContext, VerificationStatus } from "./verification-context";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { MetricsService } from "../../../../shared/metrics/metrics.service";

export type PipelineResult = {
  verificationStatus: VerificationStatus;
  distanceMeters: number | null;
  selfieS3Key: string | null;
  selfieUrl?: string;
  flags: Record<string, boolean>;
  stepResults: { step: string; ok: boolean; durationMs: number }[];
};

@Injectable()
export class AttendanceVerificationPipeline {
  private readonly logger: ContextLogger;
  private steps: VerificationStep[] = [];

  constructor(
    requestContext: RequestContextService,
    private readonly metrics: MetricsService,
  ) {
    this.logger = new ContextLogger(requestContext, AttendanceVerificationPipeline.name);
  }

  registerSteps(steps: VerificationStep[]): void {
    this.steps = steps;
  }

  async execute(ctx: AttendanceVerificationContext): Promise<PipelineResult> {
    const stepResults: PipelineResult["stepResults"] = [];
    const mergedFlags: Record<string, boolean> = {};
    let currentVerificationStatus: VerificationStatus = "verified";

    for (const step of this.steps) {
      const t0 = performance.now();
      let result: StepResult;

      try {
        result = await step.execute(ctx);
      } catch (err) {
        this.metrics.observeAttendanceVerificationStep(step.name, "error", performance.now() - t0);
        this.logger.warn("pipeline_step_failed", {
          step: step.name,
          error: err instanceof Error ? err.message : String(err),
          employeeId: ctx.employeeId,
        });
        throw err;
      }

      const durationMs = performance.now() - t0;
      this.metrics.observeAttendanceVerificationStep(step.name, "ok", durationMs);

      stepResults.push({ step: step.name, ok: true, durationMs });

      if (result.flags) {
        Object.assign(mergedFlags, result.flags);
      }
      if (result.verificationStatus) {
        currentVerificationStatus = result.verificationStatus;
      }
    }

    return {
      verificationStatus: currentVerificationStatus,
      distanceMeters: ctx.distanceMeters,
      selfieS3Key: ctx.selfieS3Key,
      selfieUrl: ctx.selfieUrl,
      flags: mergedFlags,
      stepResults,
    };
  }
}
