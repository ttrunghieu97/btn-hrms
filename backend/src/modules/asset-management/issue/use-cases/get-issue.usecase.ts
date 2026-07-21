import { Injectable } from "@nestjs/common";
import { AssetIssueMapper } from "../mappers/asset-issue.mapper";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetIssueUseCase {
  constructor(private readonly issueRepo: AssetIssueRepository) {}

  async execute(id: string) {
    const row = await this.issueRepo.findById(id);
    if (!row) {
      throwNotFound("Asset issue not found", ERROR_CODES.ASSET_ISSUE_NOT_FOUND, {
        id,
      });
    }
    return AssetIssueMapper.toResponse(row);
  }
}
