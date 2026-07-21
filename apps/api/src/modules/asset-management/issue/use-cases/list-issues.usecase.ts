import { Injectable } from "@nestjs/common";
import { IssueQueryDto } from "../dto/issue-query.dto";
import { AssetIssueMapper } from "../mappers/asset-issue.mapper";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";

@Injectable()
export class ListIssuesUseCase {
  constructor(private readonly issueRepo: AssetIssueRepository) {}

  async execute(query: IssueQueryDto) {
    const result = await this.issueRepo.list(query);
    return {
      rows: AssetIssueMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
