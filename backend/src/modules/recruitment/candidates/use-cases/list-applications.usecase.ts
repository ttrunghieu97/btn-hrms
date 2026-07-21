import { Injectable } from "@nestjs/common";
import { CandidateQueryDto } from "../dto/candidate-query.dto";
import { CandidateMapper } from "../mappers/candidate.mapper";
import { ApplicationsRepository } from "../repositories/applications.repository";

@Injectable()
export class ListApplicationsUseCase {
  constructor(private readonly applicationsRepo: ApplicationsRepository) {}

  async execute(query: CandidateQueryDto) {
    const result = await this.applicationsRepo.list(query);
    return {
      rows: CandidateMapper.toApplicationResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
