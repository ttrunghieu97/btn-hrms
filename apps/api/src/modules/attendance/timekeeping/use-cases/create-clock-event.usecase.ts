import { Inject, Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import {
  CONTRACTS_TOKENS,
  WorkforceTimeManagementPort,
} from "../../../../contracts";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { CreateClockEventDto } from "../dto/create-clock-event.dto";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { RecomputeAttendanceDayUseCase } from "./recompute-attendance-day.usecase";
import { AttendanceCheckedEvent } from "../../../../core/events/events/attendance-checked.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateClockEventUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repo: AttendanceTimekeepingRepository,
    private readonly recomputeAttendanceDay: RecomputeAttendanceDayUseCase,
    @Inject(CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT)
    private readonly workforcePort: WorkforceTimeManagementPort,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateClockEventUseCase.name);
  }

  async execute(
    actorUserId: string,
    fallbackEmployeeId: string,
    dto: CreateClockEventDto,
  ) {
    const employeeId = dto.employeeId ?? fallbackEmployeeId;
    if (!employeeId) {
      throwBadRequest(
        "Employee profile is required to log attendance",
        ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED,
      );
    }

    const employeeContext =
      await this.workforcePort.getEmployeeContext(employeeId);
    if (employeeContext?.employmentStatus !== "eligible") {
      throwBadRequest(
        "Employee is not eligible for attendance check",
        ERROR_CODES.INVALID_REQUEST,
        { employeeId },
      );
    }

    const eventDate =
      dto.workDate ?? todayDateString();
    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();

    const result = await this.repo.transaction(async (tx) => {
      const event = await this.repo.createClockEvent({
        employeeId,
        type: dto.type,
        time: eventTime,
        date: eventDate,
        source: dto.source ?? "api",
        location: dto.location,
        image: dto.image,
        note: dto.note,
        locationId: dto.locationId,
        session: dto.session,
      });

      await this.eventOutbox.stage(
        new AttendanceCheckedEvent(employeeId, dto.type, eventDate),
        tx,
      );

      const recomputed = await this.recomputeAttendanceDay.execute(
        employeeId,
        eventDate,
      );

      return {
        event,
        summary: recomputed.summary,
        exceptions: recomputed.exceptions,
      };
    });

    return result;
  }
}



