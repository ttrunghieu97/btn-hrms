import { Injectable } from "@nestjs/common";
import { CreateClockEventUseCase } from "./create-clock-event.usecase";
import { CreateManualCorrectionDto } from "../dto/create-clock-event.dto";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateManualCorrectionUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly createClockEvent: CreateClockEventUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateManualCorrectionUseCase.name);
  }

  async execute(actorUserId: string, dto: CreateManualCorrectionDto) {
    return this.createClockEvent.execute(actorUserId, dto.employeeId ?? "", {
      ...dto,
      source: "manual",
      note: dto.note ?? dto.reason,
    });
  }
}



