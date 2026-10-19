import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { EVENT_BUS_TOKEN, IEventBus } from "@/core/events/event-bus.interface";
import { LeaveApprovalRequestedEvent } from "@/core/events/events/leave-approval-requested.event";
import { LeaveCancellationRequestedEvent } from "@/core/events/events/leave-cancellation-requested.event";
import { LeaveApprovalPolicyResolver } from "./leave-approval-policy.resolver";
import { LeaveApprovalGateway } from "./leave-approval.gateway";
import { LeaveApprovalLinkRepository } from "./leave-approval-link.repository";
import { ContextLogger } from "@/shared/logging/context-logger";
import { RequestContextService } from "@/shared/context/request-context.service";
import { EventIdempotencyRepository } from "@/infrastructure/repositories/event-idempotency.repository";

const CONSUMER_ID = "leave-approval-integration";

@Injectable()
export class LeaveApprovalIntegrationHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
    private readonly policyResolver: LeaveApprovalPolicyResolver,
    private readonly gateway: LeaveApprovalGateway,
    private readonly linkRepo: LeaveApprovalLinkRepository,
    private readonly idempotency: EventIdempotencyRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      LeaveApprovalIntegrationHandler.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      LeaveApprovalRequestedEvent.eventType,
      this.handleLeaveApprovalRequested.bind(this),
    );
    this.eventBus.on(
      LeaveCancellationRequestedEvent.eventType,
      this.handleLeaveCancellationRequested.bind(this),
    );
  }

  private async handleLeaveApprovalRequested(
    event: LeaveApprovalRequestedEvent,
  ): Promise<void> {
    if (await this.idempotency.isProcessed(CONSUMER_ID, event.eventId)) return;

    try {
      const { leaveRequestId, employeeId, leaveTypeId, requestedByUserId } =
        event.data;

      // Idempotent: skip if correlation already exists (from prior partial success)
      const existingLink = await this.linkRepo.findByLeaveRequestId(
        leaveRequestId,
      );
      if (existingLink) {
        this.logger.log(
          `Correlation already exists for leave ${leaveRequestId} — skipping`,
        );
        await this.idempotency.markProcessed(CONSUMER_ID, event.eventId);
        return;
      }

      const policyId = await this.policyResolver.resolve({
        leaveTypeId,
        employeeId,
      });
      if (!policyId) {
        this.logger.warn(
          `No approval policy for leaveTypeId=${leaveTypeId}. Leave ${leaveRequestId} skipped.`,
        );
        return;
      }

      const approvalRequest = await this.gateway.requestApproval({
        policyId,
        leaveRequestId,
        requestedByUserId,
      });

      await this.linkRepo.create({
        leaveRequestId,
        approvalRequestId: approvalRequest.id,
        policyId,
      });

      await this.idempotency.markProcessed(CONSUMER_ID, event.eventId);

      this.logger.log(
        `Approval requested: leave ${leaveRequestId} → approval ${approvalRequest.id}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed processing LeaveApprovalRequestedEvent eventId=${event.eventId}: ${msg}`,
      );
      throw error;
    }
  }

  private async handleLeaveCancellationRequested(
    event: LeaveCancellationRequestedEvent,
  ): Promise<void> {
    if (await this.idempotency.isProcessed(CONSUMER_ID, event.eventId)) return;

    try {
      const { leaveRequestId } = event.data;

      const link = await this.linkRepo.findByLeaveRequestId(leaveRequestId);
      if (!link) {
        this.logger.warn(
          `No approval link for leave ${leaveRequestId} — skipping cancel.`,
        );
        return;
      }

      await this.gateway.cancelApproval(link.approvalRequestId);
      await this.linkRepo.updateStatus(leaveRequestId, "cancelled");
      await this.idempotency.markProcessed(CONSUMER_ID, event.eventId);

      this.logger.log(
        `Approval cancelled: leave ${leaveRequestId} (approval ${link.approvalRequestId})`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed processing LeaveCancellationRequestedEvent eventId=${event.eventId}: ${msg}`,
      );
      throw error;
    }
  }
}
