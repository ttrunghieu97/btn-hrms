import { Injectable } from "@nestjs/common";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";
import { throwBadRequest, throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { OnboardingItemCompletedEvent } from "../events/onboarding-item-completed.event";
import { OnboardingCompletedEvent } from "../events/onboarding-completed.event";

export interface CompleteOnboardingTaskInput {
  processId: string;
  itemId: string;
  userId?: string | null;
  action?: "complete" | "reopen" | "skip";
  note?: string;
}

@Injectable()
export class CompleteOnboardingTaskUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly processRepo: OnboardingProcessRepository,
    private readonly requestContext: RequestContextService,
    private readonly outbox: EventOutboxService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      CompleteOnboardingTaskUseCase.name,
    );
  }

  async execute(input: CompleteOnboardingTaskInput) {
    const { processId, itemId, action = "complete", note } = input;
    const actorUserId =
      input.userId ?? this.requestContext.get()?.userId ?? null;

    const process = await this.processRepo.findByIdWithItems(processId);
    if (!process || process.type !== "onboarding") {
      throwNotFound(
        "Onboarding process not found",
        ERROR_CODES.NOT_FOUND,
        { processId },
      );
    }

    const item = process.checklistItems.find((i) => i.id === itemId);
    if (!item) {
      throwNotFound(
        "Checklist item not found",
        ERROR_CODES.NOT_FOUND,
        { itemId },
      );
    }

    if (action === "skip" && item.mandatory) {
      throwBadRequest(
        "Cannot skip a mandatory onboarding checklist item",
        ERROR_CODES.INVALID_REQUEST,
        { itemId },
      );
    }

    const newStatus =
      action === "skip" ? "skipped" : action === "reopen" ? "pending" : "completed";

    await this.processRepo.updateChecklistItemStatus(
      itemId,
      newStatus,
      action === "complete" ? actorUserId ?? undefined : undefined,
      note,
    );

    const completedAtIso = newStatus === "completed" ? new Date().toISOString() : null;

    await this.outbox.stage(
      new OnboardingItemCompletedEvent({
        processId,
        itemId,
        status: newStatus,
        completedByUserId: newStatus === "completed" ? actorUserId : null,
        completedAt: completedAtIso,
        notes: note ?? null,
      }),
    );

    this.logger.log(
      `Onboarding checklist item ${itemId} transitioned to ${newStatus} by user ${actorUserId}`,
    );

    // Refresh items to check if process should transition
    const updated = await this.processRepo.findByIdWithItems(processId);
    if (updated?.checklistItems.length) {
      const allDone = updated.checklistItems.every(
        (i) => i.status === "completed" || i.status === "skipped",
      );
      if (allDone && process.status !== "completed") {
        const processCompletedAt = new Date();
        await this.processRepo.updateProcessStatus(processId, "completed", processCompletedAt);
        await this.outbox.stage(
          new OnboardingCompletedEvent({
            processId,
            employeeId: process.employeeId,
            completedAt: processCompletedAt.toISOString(),
          }),
        );
        this.logger.log(
          `All checklist items finished; onboarding process ${processId} marked completed`,
        );
      } else if (!allDone && process.status === "completed") {
        await this.processRepo.updateProcessStatus(processId, "in_progress", null);
      }
    }

    return {
      id: itemId,
      processId,
      status: newStatus,
      isCompleted: newStatus === "completed",
      completedAt: completedAtIso,
      completedByUserID: newStatus === "completed" ? actorUserId : null,
      notes: note ?? null,
    };
  }
}
