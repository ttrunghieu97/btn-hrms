import { Injectable } from "@nestjs/common";
import { PostingMapper } from "../mappers/posting.mapper";
import {
  PostingsRepository,
  type PostingStatus,
} from "../repositories/postings.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const ALLOWED_TRANSITIONS: Record<PostingStatus, PostingStatus[]> = {
  open: ["paused", "closed"],
  paused: ["open", "closed"],
  closed: [],
};

@Injectable()
export class ChangePostingStatusUseCase {
  constructor(private readonly postingsRepo: PostingsRepository) {}

  async execute(id: string, target: PostingStatus) {
    const existing = await this.postingsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Posting not found",
        ERROR_CODES.RECRUITMENT_POSTING_NOT_FOUND,
        { id },
      );
    }

    const current = existing.status;
    if (!ALLOWED_TRANSITIONS[current].includes(target)) {
      throwConflict(
        "Invalid posting status transition",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, from: current, to: target },
      );
    }

    const updated = await this.postingsRepo.updateStatus(id, target);
    return PostingMapper.toResponse(updated!);
  }
}
