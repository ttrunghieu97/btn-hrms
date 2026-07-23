import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ExecuteScheduledTerminationsUseCase } from "../use-cases/execute-scheduled-terminations.usecase";

@Injectable()
export class TerminationSchedulerJob {
  private readonly logger = new Logger(TerminationSchedulerJob.name);

  constructor(
    private readonly executeUseCase: ExecuteScheduledTerminationsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async processDueTerminations() {
    this.logger.log("Starting scheduled termination processing");
    try {
      const result = await this.executeUseCase.processAllDue();
      this.logger.log(`Scheduled termination processing complete: ${result.processed} processed`);
    } catch (err) {
      this.logger.error("Scheduled termination processing failed", String(err));
    }
  }
}
