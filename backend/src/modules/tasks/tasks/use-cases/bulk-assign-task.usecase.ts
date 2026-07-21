import { type AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Injectable } from "@nestjs/common";
import { BulkAssignTaskDto } from "../dto/bulk-assign-task.dto";
import { WorkflowEngine } from "../../../platform-workflow-engine/tasks/workflow-engine";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class BulkAssignTaskUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, BulkAssignTaskUseCase.name);
  }

  async execute(dto: BulkAssignTaskDto, actor: AuthUser) {
    const actorPerms: string[] = actor?.permissions ?? [];
    const canManageAll =
      actor?.isSuperAdmin ||
      actorPerms.includes("ALL") ||
      actorPerms.includes("tasks:manage");
    const canManageScoped = actorPerms.includes(Permissions.TASKS_EDIT);

    if (!canManageAll && !canManageScoped) {
      return {
        updated: [],
        failed: dto.taskIds.map((id) => ({ id, reason: "permission_denied" })),
      };
    }

    const updated: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    const uniqueIds = Array.from(new Set(dto.taskIds));
    for (const taskId of uniqueIds) {
      try {
        await this.workflowEngine.execute({
          taskId,
          actor,
          transition: dto.assigneeId ? "assign" : "unassign",
          data: { assigneeId: dto.assigneeId ?? null },
        });
        updated.push(taskId);
      } catch {
        failed.push({ id: taskId, reason: "failed" });
      }
    }

    return { updated, failed };
  }
}



