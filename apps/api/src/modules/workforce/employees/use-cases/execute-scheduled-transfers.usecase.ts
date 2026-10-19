import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { ApplyTransferUseCase } from "./apply-transfer.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ExecuteScheduledTransfersUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly workflowEngine: PlatformWorkflowEngineService,
    private readonly applyTransfer: ApplyTransferUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      this.requestContext,
      ExecuteScheduledTransfersUseCase.name,
    );
  }

  async execute(batchSize = 50) {
    const definition = await this.workflowEngine.getActiveDefinition("transfer");
    if (!definition) {
      this.logger.warn({ event: "transfer_worker.definition_not_found" });
      return { processed: 0 };
    }

    const today = todayDateString();
    const instances = await this.workflowEngine.findDueScheduledInstances(
      definition.id,
      today,
      batchSize,
    );

    let processed = 0;

    for (const instance of instances) {
      if (instance.currentState !== "approved" || instance.status !== "active") {
        continue;
      }

      try {
        await this.applyTransfer.execute(instance.id, true, instance.subjectId);
        processed++;
      } catch (err) {
        this.logger.error({
          event: "transfer_worker.execute_failed",
          employeeId: instance.subjectId,
          workflowInstanceId: instance.id,
          error: String(err),
        });
      }
    }

    return { processed };
  }
}
