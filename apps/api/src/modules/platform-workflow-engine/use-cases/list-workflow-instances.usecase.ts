import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";
import { WorkflowInstanceQueryDto } from "../dto/workflow-instance-query.dto";

@Injectable()
export class ListWorkflowInstancesUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(query: WorkflowInstanceQueryDto) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const opts = {
      status: query.status,
      definitionId: query.definitionId,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      limit,
      offset,
    };

    const [rows, total] = await Promise.all([
      this.repo.listInstances(opts),
      this.repo.countInstances(opts),
    ]);

    return { rows, total: Number(total), page, limit, hasNext: offset + limit < Number(total) };
  }
}
