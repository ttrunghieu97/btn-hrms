import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineService } from "../platform-workflow-engine.service";
import { TransitionWorkflowInstanceDto } from "../dto/transition-workflow-instance.dto";

@Injectable()
export class TransitionWorkflowInstanceUseCase {
  constructor(private readonly service: PlatformWorkflowEngineService) {}

  async execute(instanceId: string, dto: TransitionWorkflowInstanceDto, actorUserId?: string | null) {
    return this.service.transition(instanceId, dto.transition, actorUserId ?? null, dto.payload);
  }
}
