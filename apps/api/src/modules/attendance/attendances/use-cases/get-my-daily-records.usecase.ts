import { Injectable } from "@nestjs/common";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { groupEventsToDailyRecords } from "../attendances.helpers";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetMyDailyRecordsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetMyDailyRecordsUseCase.name);
  }

  async execute(employeeId: string, month?: string) {
    const events = await this.attendancesRepo.findMyAttendanceAll(
      employeeId,
      month,
    );
    return groupEventsToDailyRecords(events as any  []);
  }
}



