import { Inject, Injectable } from "@nestjs/common";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { AttendanceSessionRepository } from "../repositories/attendance-session.repository";
import { CLOCK_PORT, type ClockPort } from "../ports/clock.port";
import {
  CONTRACTS_TOKENS,
  type WorkforceTimeManagementPort,
  type EmployeeShiftReaderPort,
  type ILocationReader,
  LOCATION_READER_PORT,
} from "../../../../contracts";
import { AttendancePolicyService } from "../services/attendance-policy.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

export type SessionView = {
  id: string;
  type: "MORNING" | "AFTERNOON" | "LUNCH_DUTY" | "NIGHT" | "OT";
  status: "READY" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null; // ISO time
  actualEnd: string | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  warnings: string[];
};

export type TodayAttendanceResponseDto = {
  date: string;
  todaySessions: SessionView[];
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    locationName: string;
  } | null;
  geofence: {
    latitude: string | null;
    longitude: string | null;
    radiusMeters: number | null;
  } | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  warnings: string[];
};

@Injectable()
export class GetTodayAttendanceUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly sessionRepo: AttendanceSessionRepository,
    private readonly requestContext: RequestContextService,
    private readonly policy: AttendancePolicyService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT)
    private readonly workforcePort: WorkforceTimeManagementPort,
    @Inject(CONTRACTS_TOKENS.EMPLOYEE_SHIFT_READER_PORT)
    private readonly shiftReader: EmployeeShiftReaderPort,
    @Inject(LOCATION_READER_PORT)
    private readonly locationReader: ILocationReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetTodayAttendanceUseCase.name);
  }

  async execute(employeeId: string): Promise<TodayAttendanceResponseDto> {
    const today = this.clock.today();
    const now = this.clock.now();
    const warnings: string[] = [];

    // 1. Get employee context (for employment status + site)
    const empCtx = await this.workforcePort.getEmployeeContext(employeeId);

    // 2. Query shift assignment for employee on this day
    const assignment = await this.shiftReader.findShiftAssignmentForEmployeeDay(
      employeeId, today,
    );
    const hasShift = assignment != null && empCtx?.employmentStatus === "eligible" && empCtx?.currentSite != null;

    // 3. Build shift / geofence display info
    let shift = null;
    if (hasShift && assignment && empCtx?.currentSite) {
      let locationName = "Trụ sở chính";
      if (empCtx.currentSiteId) {
        const loc = await this.locationReader.findById(empCtx.currentSiteId) as { name: string } | null;
        if (loc) {
          locationName = loc.name;
        }
      }

      shift = {
        id: assignment.id,
        name: "Ca Làm Việc",
        startTime: assignment.shiftTemplate?.startTime ?? "09:00",
        endTime: assignment.shiftTemplate?.endTime ?? "18:00",
        locationName,
      };
    }

    const geofence = empCtx?.currentSite
      ? { latitude: empCtx.currentSite.latitude, longitude: empCtx.currentSite.longitude, radiusMeters: empCtx.currentSite.radiusMeters }
      : null;

    // 3. Read today's sessions from the sessions table
    let dbSessions = await this.sessionRepo.findTodaySessions(employeeId, today);

    // 4. Ensure all expected sessions exist (create READY ones that are missing)
    //    Phase 2D: when Assignment Port is live, sessions are pre-created from roster.
    //    For enterprise flexibility, if a session type is not yet created for today, we pre-create it in READY status.
    const existingTypes = new Set(dbSessions.map((s) => s.sessionType));
    const defaultSessions: { type: "MORNING" | "AFTERNOON" | "LUNCH_DUTY"; plannedStart: string; plannedEnd: string }[] = [
      { type: "MORNING", plannedStart: "08:00", plannedEnd: "12:00" },
      { type: "LUNCH_DUTY", plannedStart: "12:00", plannedEnd: "13:00" },
      { type: "AFTERNOON", plannedStart: "13:00", plannedEnd: "17:00" },
    ];

    let hasCreatedAny = false;
    for (const s of defaultSessions) {
      if (!existingTypes.has(s.type)) {
        await this.sessionRepo.create({
          employeeId,
          sessionType: s.type,
          date: today,
          status: "READY",
          plannedStart: s.plannedStart,
          plannedEnd: s.plannedEnd,
        });
        hasCreatedAny = true;
      }
    }

    if (hasCreatedAny) {
      dbSessions = await this.sessionRepo.findTodaySessions(employeeId, today);
    }

    // 5. Build session views
    let hasActive = false;
    const sessionViews: SessionView[] = dbSessions.map((s) => {
      const isActive = s.status === "IN_PROGRESS";
      const isCompleted = s.status === "COMPLETED";
      if (isActive) hasActive = true;

      // Check warnings from clock events linked to this session
      const sessionWarnings: string[] = [];

      return {
        id: s.id,
        type: s.sessionType,
        status: s.status,
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        actualStart: s.actualStart?.toISOString() ?? null,
        actualEnd: s.actualEnd?.toISOString() ?? null,
        canCheckIn: s.status === "READY",
        canCheckOut: isActive,
        warnings: sessionWarnings,
      };
    });

    // 6. Overall permissions
    const anyCanCheckIn = sessionViews.some((sv) => sv.canCheckIn && hasShift);
    const noShiftCanCheckIn = !hasShift && this.policy.allowCheckInWithoutShift;
    const canCheckIn = anyCanCheckIn || noShiftCanCheckIn;
    const canCheckOut = sessionViews.some((sv) => sv.canCheckOut);

    return {
      date: today,
      todaySessions: sessionViews,
      shift,
      geofence,
      canCheckIn,
      canCheckOut,
      warnings,
    };
  }
}
