import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";

@Injectable()
export class ListApprovalPoliciesUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(query: { page?: number; limit?: number; key?: string; isActive?: boolean }) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const filterOpts = { key: query.key, isActive: query.isActive };

    const [rows, totalResult] = await Promise.all([
      this.repo.listPolicies({ ...filterOpts, limit, offset }),
      this.repo.countPolicies(filterOpts),
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
