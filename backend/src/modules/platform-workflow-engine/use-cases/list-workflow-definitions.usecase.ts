import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";

@Injectable()
export class ListWorkflowDefinitionsUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(query: { page?: number; limit?: number }) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      this.repo.listDefinitions({ limit, offset }),
      this.repo.countDefinitions(),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return { rows, total, page, limit, hasNext: offset + limit < total };
  }
}
