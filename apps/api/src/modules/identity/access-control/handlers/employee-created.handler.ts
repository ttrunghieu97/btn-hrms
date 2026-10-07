import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../../core/events/event-bus.interface";
import { EmployeeCreatedEvent } from "../../../../core/events/events/employee-created.event";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { EMPLOYEE_READER_PORT, IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";
import { AssignDefaultEmployeeRoleUseCase } from "../use-cases/assign-default-employee-role.usecase";

@Injectable()
export class EmployeeCreatedHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
    private readonly requestContext: RequestContextService,
    private readonly assignDefaultEmployeeRole: AssignDefaultEmployeeRoleUseCase,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      EmployeeCreatedHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      EmployeeCreatedEvent.eventType,
      async (event: EmployeeCreatedEvent) => {
        this.logger.log(`Employee created: ${event.data.employeeId}`);

        const employee = await this.employeeReader.findById(
          event.data.employeeId,
        );

        if (!employee?.userId) {
          this.logger.warn(
            `Employee not found or missing userId: ${event.data.employeeId}`,
          );
          return;
        }

        const assignment = await this.assignDefaultEmployeeRole.execute(
          employee.userId,
        );

        this.logger.log(
          `Assigned default role ${assignment.roleName} to user ${employee.userId}`,
        );
      },
    );
  }
}
