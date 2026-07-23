import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineService } from "../platform-workflow-engine.service";
import { StartWorkflowInstanceDto } from "../dto/start-workflow-instance.dto";

@Injectable()
export class StartWorkflowInstanceUseCase {
  constructor(private readonly service: PlatformWorkflowEngineService) {}

  async execute(dto: StartWorkflowInstanceDto, actorUserId?: string | null) {
    return this.service.startWorkflow({
      key: dto.key,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      actorUserId: actorUserId ?? null,
      metadata: dto.metadata,
    });
  }
}
