import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { CONTRACTS_TOKENS, WorkforceTimeManagementPort } from "../../../../contracts";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockService } from "../services/attendance-period-lock.service";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { RecomputeAttendanceDayUseCase } from "../use-cases/recompute-attendance-day.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import {
  BatchTimesheetDto,
  BatchTimesheetResponseDto,
  BatchErrorDto,
  BatchTimesheetRecordDto,
} from "../dto/timesheet.dto";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { TimesheetSavedEvent } from "../../../../core/events/events/timesheet-saved.event";

@Injectable()
export class TimesheetService {
  private readonly logger: ContextLogger;
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
    private readonly recomputeAttendanceDay: RecomputeAttendanceDayUseCase,
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
    @Inject(CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT)
    private readonly workforcePort: WorkforceTimeManagementPort,
    private readonly requestContext: RequestContextService,
    private readonly eventOutbox: EventOutboxService,
  ) {
    this.logger = new ContextLogger(this.requestContext, TimesheetService.name);
  }

  async batchSave(
    actorUserId: string,
    dto: BatchTimesheetDto,
  ): Promise<BatchTimesheetResponseDto> {
    // 1. Ensure period lock record exists and check editability
    const periodLock = await this.periodLockRepo.ensurePeriod(dto.period);
    if (!this.periodLockService.canEdit(periodLock.status)) {
      throwBadRequest(
        `Period ${dto.period} is ${periodLock.status} — edits not allowed`,
        ERROR_CODES.INVALID_REQUEST,
        { period: dto.period, status: periodLock.status },
      );
    }

    // 2. Process records individually — partial success per record
    const errors: BatchErrorDto[] = [];
    let successCount = 0;

    for (const record of dto.records) {
      try {
        await this.processSingleRecord(actorUserId, dto.period, record);
        successCount++;
      } catch (err: any) {
        errors.push({
          employeeId: record.employeeId,
          workDate: record.workDate,
          reason: err?.message ?? "Unknown error",
        });
      }
    }

    // 3. Publish domain event
    await this.eventOutbox.stage(
      new TimesheetSavedEvent({ period: dto.period, recordCount: dto.records.length, actorUserId }),
    );

    return {
      success: successCount,
      failed: errors.length,
      errors,
    };
  }

  private async processSingleRecord(
    actorUserId: string,
    period: string,
    record: BatchTimesheetRecordDto,
  ): Promise<void> {
    // Validate workDate belongs to period
    const recordPeriod = record.workDate.substring(0, 7);
    if (recordPeriod !== period) {
      throw new Error(`Work date ${record.workDate} does not belong to period ${period}`);
    }

    // Validate check-in < check-out
    if (record.checkIn >= record.checkOut) {
      throw new Error(`Check-in ${record.checkIn} must be before check-out ${record.checkOut}`);
    }

    // Validate employee exists and is eligible
    const employeeContext = await this.workforcePort.getEmployeeContext(record.employeeId);
    if (!employeeContext || employeeContext.employmentStatus !== "eligible") {
      throw new Error(`Employee ${record.employeeId} is not eligible for attendance`);
    }

    // Create check-in and check-out attendance records
    const checkInTime = new Date(`${record.workDate}T${record.checkIn}:00`);
    const checkOutTime = new Date(`${record.workDate}T${record.checkOut}:00`);

    // Run in per-record transaction
    await this.timekeepingRepo.transaction(async () => {
      // Delete existing clock events for this employee on this day (replace semantics)
      const existing = await this.timekeepingRepo.findClockEventsByEmployeeDay(
        record.employeeId,
        record.workDate,
      );
      const existingIds = existing.map((e) => e.id);
      if (existingIds.length > 0) {
        await this.timekeepingRepo.deleteClockEvents(existingIds);
      }

      // Create check-in
      await this.timekeepingRepo.createClockEvent({
        employeeId: record.employeeId,
        type: "check_in",
        time: checkInTime,
        date: record.workDate,
        source: "manual_hr",
        session: this.determineSession(record.checkIn),
      });

      // Create check-out
      await this.timekeepingRepo.createClockEvent({
        employeeId: record.employeeId,
        type: "check_out",
        time: checkOutTime,
        date: record.workDate,
        source: "manual_hr",
        session: this.determineSession(record.checkOut),
      });

      // Recompute daily summary
      await this.recomputeAttendanceDay.execute(
        record.employeeId,
        record.workDate,
      );
    });
  }

  private determineSession(time: string): "morning" | "noon" | "afternoon" {
    const hour = parseInt(time.split(":")[0]!, 10);
    if (hour < 12) return "morning";
    if (hour < 13) return "noon";
    return "afternoon";
  }
}

