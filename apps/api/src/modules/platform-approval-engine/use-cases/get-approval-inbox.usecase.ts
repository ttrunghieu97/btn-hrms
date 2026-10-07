import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";

@Injectable()
export class GetApprovalInboxUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(userId: string, query: { page?: number; limit?: number }) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      this.repo.listPendingStepsByApprover(userId, { limit, offset }),
      this.repo.countPendingStepsByApprover(userId),
    ]);

    return {
      rows,
      total: Number(totalResult),
      page,
      limit,
      hasNext: offset + limit < Number(totalResult),
    };
  }
}
