import { Inject, Injectable } from "@nestjs/common";
import { AttendancesRepository } from "../repositories/attendances.repository";
import { groupEventsToDailyRecords } from "../attendances.helpers";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

import { CLOCK_PORT, type ClockPort } from "../ports/clock.port";

@Injectable()
export class GetCheckedInTodayUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly attendancesRepo: AttendancesRepository,
    private readonly requestContext: RequestContextService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetCheckedInTodayUseCase.name);
  }

  async execute(date?: string) {
    const targetDate = date ?? this.clock.today();

    const events =
      await this.attendancesRepo.findByDateWithEmployee(targetDate);

    const byEmployee = new Map<string, any>();
    for (const e of events as any  []) {
      if (!byEmployee.has(e.employeeId)) byEmployee.set(e.employeeId, []);
      byEmployee.get(e.employeeId)!.push(e);
    }

    const result: any[]   = [];
    for (const rows of byEmployee.values()) {
      const daily = groupEventsToDailyRecords(rows)[0];
      if (!daily) continue;

      const emp = (rows)[0].employee;
      result.push({
        ...daily,
        employee: emp
          ? {
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              fullName: `${emp.firstName} ${emp.lastName}`.trim(),
              employeeCode: emp.employeeCode,
              avatar: emp.avatar,
              position:
                emp.orgAssignments?.find((assignment: { isCurrent?: boolean, jobTitle?: string | null }) => assignment.isCurrent)?.jobTitle ?? null,
              departmentName: emp.department?.name,
            }
          : undefined,
      });
    }

    return result;
  }
}






