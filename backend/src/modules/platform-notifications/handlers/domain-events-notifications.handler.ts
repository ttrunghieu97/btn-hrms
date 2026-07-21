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
import { ApprovalRequestCreatedEvent } from "../../../core/events/events/approval-request-created.event";
import { ApprovalRequestCompletedEvent } from "../../../core/events/events/approval-request-completed.event";
import { SendNotificationUseCase } from "../use-cases/send-notification.usecase";
import { PlatformApprovalEngineRepository } from "../../platform-approval-engine/repositories/platform-approval-engine.repository";

@Injectable()
export class DomainEventsNotificationsHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly sendNotification: SendNotificationUseCase,
    private readonly approvalRepo: PlatformApprovalEngineRepository,
  ) {}

  onModuleInit() {
    this.eventBus.on(EmployeeHiredEvent.eventType, async (event: EmployeeHiredEvent) => {
      await this.sendNotification.execute({
        userId: event.data.userId,
        templateName: undefined,
        preferredType: undefined,
        subject: "Welcome aboard",
        body: `You have been hired (employeeId={{employeeId}}).`,
        context: { employeeId: event.data.employeeId },
      });
    });

    this.eventBus.on(
      EmployeeOnboardedEvent.eventType,
      async (event: EmployeeOnboardedEvent) => {
        await this.sendNotification.execute({
          userId: event.data.userId,
          subject: "Onboarding completed",
          body: `Your onboarding is completed (employeeId={{employeeId}}).`,
          context: { employeeId: event.data.employeeId },
        });
      },
    );

    this.eventBus.on(LeaveRequestedEvent.eventType, async (event: LeaveRequestedEvent) => {
      if (event.data.approverUserId) {
        await this.sendNotification.execute({
          userId: event.data.approverUserId,
          subject: "Leave request pending approval",
          body: `Leave request {{leaveRequestId}} requires your approval.`,
          context: { leaveRequestId: event.data.leaveRequestId },
        });
      }
    });

    this.eventBus.on(
      ExpenseSubmittedEvent.eventType,
      async (event: ExpenseSubmittedEvent) => {
        if (event.data.approverUserId) {
          await this.sendNotification.execute({
            userId: event.data.approverUserId,
            subject: "Expense submitted",
            body: `Expense {{expenseId}} requires your approval.`,
            context: { expenseId: event.data.expenseId },
          });
        }
      },
    );

    this.eventBus.on(
      PayrollProcessedEvent.eventType,
      async (event: PayrollProcessedEvent) => {
        if (event.data.processedByUserId) {
          await this.sendNotification.execute({
            userId: event.data.processedByUserId,
            subject: "Payroll processed",
            body: `Payroll run {{payrollRunId}} processed successfully.`,
            context: { payrollRunId: event.data.payrollRunId },
          });
        }
      },
    );

    this.eventBus.on(
      PerformanceReviewedEvent.eventType,
      async (event: PerformanceReviewedEvent) => {
        await this.sendNotification.execute({
          userId: event.data.userId,
          subject: "Performance review completed",
          body: `Performance review {{reviewId}} has been completed.`,
          context: { reviewId: event.data.reviewId },
        });
      },
    );

    // ─── Approval Engine Notifications ────────────────────────────────

    this.eventBus.on(
      ApprovalRequestCreatedEvent.eventType,
      async (event: ApprovalRequestCreatedEvent) => {
        try {
          const firstStep = await this.approvalRepo.findStep(event.data.approvalRequestId, 0);
          const approverUserId = firstStep?.approverUserId;
          if (!approverUserId) return;

          await this.sendNotification.execute({
            userId: approverUserId,
            subject: "Approval request pending",
            body: `Approval for {{subjectType}}:{{subjectId}} ({{policyKey}}) requires your decision.`,
            context: {
              approvalRequestId: event.data.approvalRequestId,
              subjectType: event.data.subjectType,
              subjectId: event.data.subjectId,
              policyKey: event.data.policyKey,
            },
          });
        } catch {
          // Silently skip notification failures
        }
      },
    );

    this.eventBus.on(
      ApprovalRequestCompletedEvent.eventType,
      async (event: ApprovalRequestCompletedEvent) => {
        const approvalReq = await this.approvalRepo.findRequestById(event.data.approvalRequestId);
        if (!approvalReq?.requestedByUserId) return;

        const outcomeLabel =
          event.data.outcome === "approved" ? "approved" :
          event.data.outcome === "rejected" ? "rejected" : "cancelled";

        await this.sendNotification.execute({
          userId: approvalReq.requestedByUserId,
          subject: `Approval ${outcomeLabel}`,
          body: `Your approval request for {{subjectType}}:{{subjectId}} has been ${outcomeLabel}.`,
          context: {
            approvalRequestId: event.data.approvalRequestId,
            subjectType: event.data.subjectType,
            subjectId: event.data.subjectId,
            outcome: event.data.outcome,
          },
        });
      },
    );
  }
}
