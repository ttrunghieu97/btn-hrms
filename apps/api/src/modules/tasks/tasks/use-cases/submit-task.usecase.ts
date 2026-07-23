import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { WorkflowEngine } from "../../../platform-workflow-engine/tasks/workflow-engine";
import { SubmitTaskDto } from "../dto/submit-task.dto";
import { TasksRepository } from "../repositories/tasks.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class SubmitTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly tasksRepo: TasksRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, SubmitTaskUseCase.name);
  }

  async execute(id: string, dto: SubmitTaskDto, actor: AuthUser) {
    const existing = (await this.tasksRepo.findById(id));
    const transition = existing?.status === "revision" ? "resubmit" : "submit";

    const result = await this.workflowEngine.execute({
      taskId: id,
      actor,
      transition,
      data: { resultText: dto.resultText, checklist: dto.checklist },
    });
    return result.task;
  }
}



