import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ExecuteScheduledTransfersUseCase } from "../use-cases/execute-scheduled-transfers.usecase";

@Injectable()
export class TransferSchedulerJob {
  private readonly logger = new Logger(TransferSchedulerJob.name);

  constructor(
    private readonly executeUseCase: ExecuteScheduledTransfersUseCase,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async processDueTransfers() {
    this.logger.log("Starting scheduled transfer processing");
    try {
      const result = await this.executeUseCase.execute();
      this.logger.log(
        `Scheduled transfer processing complete: ${result.processed} processed`,
      );
    } catch (err) {
      this.logger.error("Scheduled transfer processing failed", String(err));
    }
  }
}
