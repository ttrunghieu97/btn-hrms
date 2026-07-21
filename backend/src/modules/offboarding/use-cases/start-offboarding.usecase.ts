import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import { CreateBoardingProcessUseCase } from "../../onboarding/use-cases/create-boarding-process.usecase";
import { OffboardingRepository } from "../repositories/offboarding.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { OffboardingStartedEvent } from "../domain/events/offboarding-started.event";

@Injectable()
export class StartOffboardingUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
    private readonly createBoardingProcess: CreateBoardingProcessUseCase,
    private readonly offboardingRepo: OffboardingRepository,
    private readonly outbox: EventOutboxService,
  ) {}

  async execute(
    employeeId: string,
  ): Promise<{ processId: string; status: string } | null> {
    // 1. Check no active offboarding process already exists
    const activeProcess = await this.processReader.findActiveByEmployeeId(
      employeeId,
      "offboarding",
    );
    if (activeProcess) {
      return null;
    }

    // 2. Resolve active offboarding template
    const activeTemplate = await this.processReader.findActiveTemplateByType(
      "offboarding",
    );
    if (!activeTemplate) {
      return null;
    }

    // 3. Create offboarding process via BoardingModule
    const process = await this.createBoardingProcess.execute({
      employeeId,
      templateId: activeTemplate.template.id,
      type: "offboarding",
    });

    // 4. Seed clearances
    await this.offboardingRepo.seedClearances(process.id);

    // 5. Stage event
    const event = new OffboardingStartedEvent({
      processId: process.id,
      employeeId,
      templateId: activeTemplate.template.id,
    });
    await this.outbox.stage(event).catch((err: Error) => {
      console.error(
        `[StartOffboardingUseCase] Failed to stage event: ${err.message}`,
      );
    });

    return { processId: process.id, status: process.status };
  }
}
