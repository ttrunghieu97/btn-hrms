import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineService } from "../platform-workflow-engine.service";

@Injectable()
export class CancelWorkflowInstanceUseCase {
  constructor(private readonly service: PlatformWorkflowEngineService) {}

  async execute(instanceId: string, actorUserId?: string | null) {
    return this.service.cancelInstance(instanceId, actorUserId ?? null);
  }
}
