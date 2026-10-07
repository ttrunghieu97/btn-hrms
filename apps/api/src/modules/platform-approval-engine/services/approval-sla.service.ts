import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class ApprovalSlaService {
  private readonly logger: ContextLogger;

  constructor(
    private readonly repo: PlatformApprovalEngineRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ApprovalSlaService.name);
  }

  /**
   * Process pending approval steps that exceed SLA threshold (default 48h).
   * Flags step as auto-escalated and stages an outbox event.
   */
  async processExpiredApprovals(slaHours = 48): Promise<number> {
    const expiredSteps = await this.repo.findExpiredPendingSteps(slaHours);
    if (expiredSteps.length === 0) return 0;

    let escalatedCount = 0;
    for (const step of expiredSteps) {
      try {
        await this.repo.autoEscalateStep(
          step.id,
          `Pending step ${step.stepIndex} exceeded SLA threshold of ${slaHours}h`,
        );
        escalatedCount++;
      } catch (err: any) {
        this.logger.error(`Failed to auto-escalate step ${step.id}: ${err?.message}`);
      }
    }

    return escalatedCount;
  }
}
