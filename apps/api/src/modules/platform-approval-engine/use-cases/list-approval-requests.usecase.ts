import { Injectable } from "@nestjs/common";
import { PlatformApprovalEngineRepository } from "../repositories/platform-approval-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";
import { ApprovalRequestQueryDto } from "../dto/approval-request-query.dto";

@Injectable()
export class ListApprovalRequestsUseCase {
  constructor(private readonly repo: PlatformApprovalEngineRepository) {}

  async execute(query: ApprovalRequestQueryDto) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    const filterOpts = {
      status: query.status,
      policyId: query.policyId,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      requestedByUserId: query.requestedByUserId,
    };

    const [rows, totalResult] = await Promise.all([
      this.repo.listRequests({ ...filterOpts, limit, offset }),
      this.repo.countRequests(filterOpts),
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
