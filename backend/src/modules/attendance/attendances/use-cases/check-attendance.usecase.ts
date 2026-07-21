import { Inject, Injectable } from "@nestjs/common";
import { AttendanceMapper } from "../mappers/attendance.mapper";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { AttendanceCheckedEvent } from "../../../../core/events/events/attendance-checked.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CLOCK_PORT, type ClockPort } from "../ports/clock.port";
import { AttendanceVerificationPipeline } from "../pipeline/pipeline-runner";
import { AttendanceVerificationContext } from "../pipeline/verification-context";
import { EmployeeContextStep } from "../pipeline/steps/employee-context.step";
import { GeofenceStep } from "../pipeline/steps/geofence.step";
import { IpWhitelistStep } from "../pipeline/steps/ip-whitelist.step";
import { EvidenceStep } from "../pipeline/steps/evidence.step";
import { AttendanceSessionService } from "../services/attendance-session.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { MetricsService } from "../../../../shared/metrics/metrics.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

export type PunchSelfieInput = {
  buffer: Buffer;
  mime?: string;
};

export type PunchVerificationContext = {
  ipAddress?: string | null;
  selfie?: PunchSelfieInput;
  uploadedBy?: string;
};

@Injectable()
export class CheckAttendanceUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly pipeline: AttendanceVerificationPipeline,
    private readonly employeeContextStep: EmployeeContextStep,
    private readonly geofenceStep: GeofenceStep,
    private readonly ipWhitelistStep: IpWhitelistStep,
    private readonly evidenceStep: EvidenceStep,
    private readonly requestContext: RequestContextService,
    private readonly metrics: MetricsService,
    private readonly sessionService: AttendanceSessionService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, CheckAttendanceUseCase.name);
    this.pipeline.registerSteps([
      this.employeeContextStep,
      this.geofenceStep,
      this.ipWhitelistStep,
      this.evidenceStep,
    ]);
  }

  async execute(
    employeeId: string,
    type: "check_in" | "check_out" | "break_start" | "break_end" | "note",
    image?: string,
    location?: string,
    note?: string,
    session?: "morning" | "noon" | "afternoon",
    dateOverride?: string,
    latitude?: string,
    longitude?: string,
    verification?: PunchVerificationContext,
    lunchDutyType?: "indoor" | "outdoor",
  ) {
    const t0 = performance.now();
    const resolvedSession = session ?? this.resolveSession();
    const today = dateOverride ?? this.clock.today();

    // Build pipeline context from raw inputs
    const ctx = new AttendanceVerificationContext({
      employeeId,
      type,
      session: resolvedSession,
      dateOverride,
      location,
      latitude,
      longitude,
      ipAddress: verification?.ipAddress,
      selfieBuffer: verification?.selfie?.buffer,
      selfieMime: verification?.selfie?.mime,
      uploadedBy: verification?.uploadedBy ?? this.requestContext.get()?.userId ?? undefined,
    });

    // Execute verification pipeline — throws on blocking failure
    let pipelineResult;
    try {
      pipelineResult = await this.pipeline.execute(ctx);
    } catch (err) {
      this.metrics.incrementAttendanceCheck(type, "failed", "error");
      this.metrics.observeAttendanceCheckDuration(type, performance.now() - t0);
      throw err;
    }

    // -- Persist: resolve session → append event → update session state --
    const tPersist = performance.now();
    const result = await this.attendancesRepo.transaction(async (tx) => {
      // Phase 2C: resolve/create session
      const resolved = await this.sessionService.resolveSession(
        employeeId, today, resolvedSession, type, tx,
      );

      const newRecord = await this.attendancesRepo.insertEvent({
        employeeId,
        sessionId: resolved.sessionId,
        type,
        time: this.clock.now(),
        date: today,
        session: resolvedSession,
        image: pipelineResult.selfieUrl ?? image,
        location,
        latitude,
        longitude,
        distanceMeters: pipelineResult.distanceMeters ?? undefined,
        ipAddress: verification?.ipAddress ?? undefined,
        selfieS3Key: pipelineResult.selfieS3Key ?? undefined,
        verificationStatus: pipelineResult.verificationStatus,
        flags: Object.keys(pipelineResult.flags).length > 0 ? pipelineResult.flags : undefined,
        locationId: ctx.employeeContext?.currentSite?.id ?? undefined,
        note,
        lunchDutyType,
      }, tx);

      await this.eventOutbox.stage(
        new AttendanceCheckedEvent(employeeId, type, today),
        tx,
      );

      return AttendanceMapper.toResponseDto(newRecord);
    });

    // Metrics
    this.metrics.observeAttendanceCheckDuration(type, performance.now() - t0);
    this.metrics.observeAttendanceVerificationStep("persist", "ok", performance.now() - tPersist);
    this.metrics.incrementAttendanceCheck(type, "success", pipelineResult.verificationStatus);

    return result;
  }

  private resolveSession(): "morning" | "noon" | "afternoon" {
    const hour = this.clock.now().getHours();
    if (hour < 12) return "morning";
    if (hour < 14) return "noon";
    return "afternoon";
  }
}
