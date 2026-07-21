import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../../employees/repositories/employees.repository";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { EmployeeHiredEvent } from "../../../../core/events/events/employee-hired.event";
import { v4 as uuidv4 } from "uuid";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class HireEmployeeUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly employeeRepo: EmployeesRepository,
    private readonly contractRepo: EmployeeContractsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, HireEmployeeUseCase.name);
  }

  async execute(data: {
    firstName: string;
    lastName: string;
    email: string;
    positionId?: string;
    hireDate: Date;
    salaryBase?: string;
  }) {
    const employeeId = uuidv4();

    return this.employeeRepo.transaction(async (tx) => {
      await this.employeeRepo.insertEmployee(
        {
          id: employeeId,
          userId: uuidv4(),
          firstName: data.firstName,
          lastName: data.lastName,
          employeeCode: `AUTO-${employeeId.slice(0, 8).toUpperCase()}`,
          workEmail: data.email,
          status: "working",
          startDate: new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(data.hireDate),
        },
        tx,
      );

      await this.contractRepo.create({
        employeeId,
        contractType: "permanent",
        effectiveFrom: new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh' }).format(data.hireDate),
        isCurrent: true,
      }, tx);

      const ctx = this.requestContext.get();
      const event = new EmployeeHiredEvent({
        scopeId: "workforce",
        employeeId,
        userId: ctx?.userId ?? "",
        hiredByUserId: ctx?.userId ?? null,
      });

      await this.eventOutbox.stage(event, tx);

      return employeeId;
    });
  }
}

