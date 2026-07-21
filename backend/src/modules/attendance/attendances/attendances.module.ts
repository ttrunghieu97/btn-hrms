import { Module } from "@nestjs/common";
import { AttendanceCommandController } from "./attendance-command.controller";
import { AttendanceQueryController } from "./attendance-query.controller";

import { AttendancesRepository } from "./repositories/attendances.repository";
import { AttendanceSessionRepository } from "./repositories/attendance-session.repository";
import { CheckAttendanceUseCase } from "./use-cases/check-attendance.usecase";
import { CheckAttendanceFromWebUseCase } from "./use-cases/check-attendance-from-web.usecase";
import { ListAttendancesUseCase } from "./use-cases/list-attendances.usecase";
import { ListMyAttendanceUseCase } from "./use-cases/list-my-attendance.usecase";
import { GetMyDailyRecordsUseCase } from "./use-cases/get-my-daily-records.usecase";
import { GetCheckedInTodayUseCase } from "./use-cases/get-checked-in-today.usecase";
import { GetTodayAttendanceUseCase } from "./use-cases/get-today-attendance.usecase";
import { GetEmployeesPresenceUseCase } from "./use-cases/get-employees-presence.usecase";
import { AttendanceCapturePolicyService } from "./services/attendance-capture-policy.service";
import { AttendancePolicyService } from "./services/attendance-policy.service";
import { IpWhitelistService } from "./services/ip-whitelist.service";
import { SelfieValidationService } from "./services/selfie-validation.service";
import { FacePresenceService } from "./services/face-presence.service";
import { SelfieStorageService } from "./services/selfie-storage.service";
import { AttendanceEvidenceService } from "./services/attendance-evidence.service";
import { AttendanceSessionService } from "./services/attendance-session.service";
import { SystemClockAdapter } from "./services/system-clock.adapter";
import { EvidenceStorageAdapter } from "./services/evidence-storage.adapter";
import { FacePresenceAdapter } from "./services/face-presence.adapter";
import { VirusScannerAdapter } from "./services/virus-scanner.adapter";
import { MetricsModule } from "../../../shared/metrics/metrics.module";
import { StorageModule } from "../../../infrastructure/storage/storage.module";
import { RequestContextModule } from "../../../shared/context/request-context.module";
import { AttendanceEmployeeLifecycleSubscriber } from "../subscribers/employee-lifecycle.subscriber";
import { CLOCK_PORT } from "./ports/clock.port";
import { EVIDENCE_STORAGE_PORT } from "./ports/evidence-storage.port";
import { FACE_DETECTION_PORT } from "./ports/face-detection.port";
import { AttendanceVerificationPipeline } from "./pipeline/pipeline-runner";
import { EmployeeContextStep } from "./pipeline/steps/employee-context.step";
import { GeofenceStep } from "./pipeline/steps/geofence.step";
import { IpWhitelistStep } from "./pipeline/steps/ip-whitelist.step";
import { EvidenceStep } from "./pipeline/steps/evidence.step";
import { EvidenceCleanupService } from "./services/evidence-cleanup.service";
import { VIRUS_SCANNER_PORT } from "./ports/virus-scanner.port";

@Module({
  imports: [RequestContextModule, MetricsModule, StorageModule],
  controllers: [AttendanceCommandController, AttendanceQueryController],
  providers: [
    // Subscribers
    AttendanceEmployeeLifecycleSubscriber,

    // Repositories
    AttendancesRepository,
    AttendanceSessionRepository,

    // Use cases
    CheckAttendanceUseCase,
    CheckAttendanceFromWebUseCase,
    ListAttendancesUseCase,
    ListMyAttendanceUseCase,
    GetMyDailyRecordsUseCase,
    GetCheckedInTodayUseCase,
    GetTodayAttendanceUseCase,
    GetEmployeesPresenceUseCase,

    // Domain services
    AttendanceCapturePolicyService,
    AttendancePolicyService,
    IpWhitelistService,
    SelfieValidationService,
    FacePresenceService,
    SelfieStorageService,
    AttendanceEvidenceService,
    AttendanceSessionService,

    // Port adapters
    SystemClockAdapter,
    EvidenceStorageAdapter,
    FacePresenceAdapter,
    VirusScannerAdapter,

    // Port tokens → adapter bindings
    { provide: CLOCK_PORT, useClass: SystemClockAdapter },
    { provide: EVIDENCE_STORAGE_PORT, useClass: EvidenceStorageAdapter },
    { provide: FACE_DETECTION_PORT, useClass: FacePresenceAdapter },
    { provide: VIRUS_SCANNER_PORT, useClass: VirusScannerAdapter },
    AttendanceVerificationPipeline,
    EmployeeContextStep,
    GeofenceStep,
    IpWhitelistStep,
    EvidenceStep,
    EvidenceCleanupService,
  ],
  exports: [AttendanceCapturePolicyService],
})
export class AttendancesModule {}
