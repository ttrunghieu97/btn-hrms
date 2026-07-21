import { Injectable } from "@nestjs/common";
import { UpdatePostingDto } from "../dto/update-posting.dto";
import { PostingMapper } from "../mappers/posting.mapper";
import {
  PostingsRepository,
  type PostingValues,
} from "../repositories/postings.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdatePostingUseCase {
  constructor(
    private readonly postingsRepo: PostingsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: UpdatePostingDto) {
    const existing = await this.postingsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Posting not found",
        ERROR_CODES.RECRUITMENT_POSTING_NOT_FOUND,
        { id },
      );
    }
    if (existing.status === "closed") {
      throwConflict(
        "Closed postings can no longer be edited",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const values: Partial<PostingValues> = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.requirements !== undefined
        ? { requirements: dto.requirements }
        : {}),
      ...(dto.closesAt !== undefined ? { closesAt: dto.closesAt } : {}),
      updatedBy: actorUserId,
    };

    const updated = await this.postingsRepo.update(id, values);
    return PostingMapper.toResponse(updated!);
  }
}
