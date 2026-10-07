import { Injectable } from "@nestjs/common";
import { CandidateMapper } from "../mappers/candidate.mapper";
import { ApplicationsRepository } from "../repositories/applications.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetCandidateApplicationUseCase {
  constructor(private readonly applicationsRepo: ApplicationsRepository) {}

  async execute(id: string) {
    const row = await this.applicationsRepo.findApplicationById(id);
    if (!row) {
      throwNotFound(
        "Application not found",
        ERROR_CODES.RECRUITMENT_APPLICATION_NOT_FOUND,
        { id },
      );
    }
    return CandidateMapper.toApplicationResponse(row);
  }
}
