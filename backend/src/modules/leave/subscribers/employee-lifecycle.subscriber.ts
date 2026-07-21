import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../core/events/events/employee-terminated.event";
import { LeaveRequestsRepository } from "../leave-management/repositories/leave-requests.repository";
import { EventIdempotencyRepository } from "../../../infrastructure/repositories/event-idempotency.repository";

const CONSUMER_TERMINATED = "leave:employee_terminated";

@Injectable()
export class LeaveEmployeeLifecycleSubscriber implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly idempotency: EventIdempotencyRepository,
    private readonly leaveRequestsRepo: LeaveRequestsRepository,
  ) {}

  onModuleInit() {
    this.eventBus.on(EmployeeTerminatedEvent.eventType, async (event: EmployeeTerminatedEvent) => {
      if (await this.idempotency.isProcessed(CONSUMER_TERMINATED, event.eventId)) return;

      try {
        const pendingRequests = await this.leaveRequestsRepo.findPendingByEmployee(
          event.data.employeeId,
        );

        for (const req of pendingRequests) {
          await this.leaveRequestsRepo.update(req.id, {
            status: "cancelled",
            cancelledAt: new Date(),
            note: "Auto-cancelled due to employee termination",
          });
        }

        await this.idempotency.markProcessed(CONSUMER_TERMINATED, event.eventId);
      } catch {
        // idempotency ensures retry on next delivery
      }
    });
  }
}