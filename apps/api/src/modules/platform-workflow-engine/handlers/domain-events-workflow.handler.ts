import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  EVENT_BUS_TOKEN as EVENT_BUS,
  IEventBus as EventBus,
} from "../../../core/events/event-bus.interface";
import { EmployeeHiredEvent } from "../../../core/events/events/employee-hired.event";
import { EmployeeOnboardedEvent } from "../../../core/events/events/employee-onboarded.event";
import { LeaveRequestedEvent } from "../../../core/events/events/leave-requested.event";
import { ExpenseSubmittedEvent } from "../../../core/events/events/expense-submitted.event";
import { PayrollProcessedEvent } from "../../../core/events/events/payroll-processed.event";
import { PerformanceReviewedEvent } from "../../../core/events/events/performance-reviewed.event";
import { PlatformWorkflowEngineService } from "../platform-workflow-engine.service";

@Injectable()
export class DomainEventsWorkflowHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly workflows: PlatformWorkflowEngineService,
  ) {}

  onModuleInit() {
    this.eventBus.on(EmployeeHiredEvent.eventType, async (event: EmployeeHiredEvent) => {
      await this.workflows.startWorkflow({
        key: "hiring",
        subjectType: "employee",
        subjectId: event.data.employeeId,
        actorUserId: event.data.hiredByUserId ?? null,
        metadata: { userId: event.data.userId },
      });
    });

    this.eventBus.on(
      EmployeeOnboardedEvent.eventType,
      async (event: EmployeeOnboardedEvent) => {
        await this.workflows.startWorkflow({
          key: "onboarding",
          subjectType: "employee",
          subjectId: event.data.employeeId,
          actorUserId: event.data.completedByUserId ?? null,
          metadata: { userId: event.data.userId },
        });
      },
    );

    this.eventBus.on(LeaveRequestedEvent.eventType, async (event: LeaveRequestedEvent) => {
      await this.workflows.startWorkflow({
        key: "leave_approval",
        subjectType: "leave_request",
        subjectId: event.data.leaveRequestId,
        actorUserId: event.data.userId,
        metadata: { employeeId: event.data.employeeId, approverUserId: event.data.approverUserId ?? null },
      });
    });

    this.eventBus.on(ExpenseSubmittedEvent.eventType, async (event: ExpenseSubmittedEvent) => {
      await this.workflows.startWorkflow({
        key: "expense_approval",
        subjectType: "expense",
        subjectId: event.data.expenseId,
        actorUserId: event.data.userId,
        metadata: { employeeId: event.data.employeeId, approverUserId: event.data.approverUserId ?? null },
      });
    });

    this.eventBus.on(PayrollProcessedEvent.eventType, async (event: PayrollProcessedEvent) => {
      await this.workflows.startWorkflow({
        key: "payroll_approval",
        subjectType: "payroll_run",
        subjectId: event.data.payrollRunId,
        actorUserId: event.data.processedByUserId ?? null,
      });
    });

    this.eventBus.on(
      PerformanceReviewedEvent.eventType,
      async (event: PerformanceReviewedEvent) => {
        await this.workflows.startWorkflow({
          key: "performance_review",
          subjectType: "performance_review",
          subjectId: event.data.reviewId,
          actorUserId: event.data.reviewerUserId ?? null,
          metadata: { employeeId: event.data.employeeId, userId: event.data.userId },
        });
      },
    );
  }
}

