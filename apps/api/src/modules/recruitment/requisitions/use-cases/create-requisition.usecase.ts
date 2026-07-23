import { Injectable } from "@nestjs/common";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import { RequisitionsRepository } from "../repositories/requisitions.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateRequisitionUseCase {
  constructor(
    private readonly requisitionsRepo: RequisitionsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(dto: CreateRequisitionDto) {
    if (dto.headcount < 1) {
      throwBadRequest(
        "Headcount must be at least 1",
        ERROR_CODES.RECRUITMENT_VALIDATION,
        { headcount: dto.headcount },
      );
    }
    if (
      dto.budgetMin !== undefined &&
      dto.budgetMax !== undefined &&
      Number(dto.budgetMin) > Number(dto.budgetMax)
    ) {
      throwBadRequest(
        "budgetMin cannot exceed budgetMax",
        ERROR_CODES.RECRUITMENT_VALIDATION,
        { budgetMin: dto.budgetMin, budgetMax: dto.budgetMax },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const created = await this.requisitionsRepo.create({
      departmentId: dto.departmentId,
      ...(dto.positionId ? { positionId: dto.positionId } : {}),
      title: dto.title,
      headcount: dto.headcount,
      ...(dto.budgetMin !== undefined ? { budgetMin: dto.budgetMin } : {}),
      ...(dto.budgetMax !== undefined ? { budgetMax: dto.budgetMax } : {}),
      ...(dto.justification !== undefined
        ? { justification: dto.justification }
        : {}),
      status: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    return RequisitionMapper.toResponse(created!);
  }
}
