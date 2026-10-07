import { Injectable } from "@nestjs/common";
import { PostingMapper } from "../mappers/posting.mapper";
import { PostingsRepository } from "../repositories/postings.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetPostingUseCase {
  constructor(private readonly postingsRepo: PostingsRepository) {}

  async execute(id: string) {
    const row = await this.postingsRepo.findById(id);
    if (!row) {
      throwNotFound(
        "Posting not found",
        ERROR_CODES.RECRUITMENT_POSTING_NOT_FOUND,
        { id },
      );
    }
    return PostingMapper.toResponse(row);
  }
}
