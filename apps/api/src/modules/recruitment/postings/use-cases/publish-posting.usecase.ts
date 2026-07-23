import { Injectable } from "@nestjs/common";
import { CreatePostingDto } from "../dto/create-posting.dto";
import { PostingMapper } from "../mappers/posting.mapper";
import { PostingsRepository } from "../repositories/postings.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class PublishPostingUseCase {
  constructor(
    private readonly postingsRepo: PostingsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: CreatePostingDto) {
    const requisition = await this.postingsRepo.findRequisitionById(
      dto.requisitionId,
    );
    if (!requisition) {
      throwNotFound(
        "Requisition not found",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_FOUND,
        { requisitionId: dto.requisitionId },
      );
    }
    if (requisition.status !== "approved") {
      throwConflict(
        "Requisition must be approved before publishing a posting",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_APPROVED,
        { requisitionId: dto.requisitionId, status: requisition.status },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const created = await this.postingsRepo.create({
      requisitionId: dto.requisitionId,
      title: dto.title,
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.requirements !== undefined
        ? { requirements: dto.requirements }
        : {}),
      ...(dto.openedAt !== undefined ? { openedAt: dto.openedAt } : {}),
      ...(dto.closesAt !== undefined ? { closesAt: dto.closesAt } : {}),
      status: "open",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    return PostingMapper.toResponse(created!);
  }
}
