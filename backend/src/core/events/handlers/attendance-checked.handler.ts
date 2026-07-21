import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../event-bus.interface";
import { AttendanceCheckedEvent } from "../events/attendance-checked.event";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";

@Injectable()
export class AttendanceCheckedHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      AttendanceCheckedHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      AttendanceCheckedEvent.name,
      async (event: AttendanceCheckedEvent) => {
        this.logger.log(
          `Attendance checked: employee=${event.employeeId} type=${event.type} date=${event.date}`,
        );
      },
    );
  }
}
