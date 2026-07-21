import { Injectable } from "@nestjs/common";
import { UpdateRequisitionDto } from "../dto/update-requisition.dto";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import {
  RequisitionsRepository,
  type RequisitionValues,
} from "../repositories/requisitions.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateRequisitionUseCase {
  constructor(
    private readonly requisitionsRepo: RequisitionsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async execute(id: string, dto: UpdateRequisitionDto) {
    const existing = await this.requisitionsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Requisition not found",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_FOUND,
        { id },
      );
    }
    if (existing.status !== "draft") {
      throwConflict(
        "Only draft requisitions can be edited",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const nextMin =
      dto.budgetMin !== undefined ? dto.budgetMin : existing.budgetMin;
    const nextMax =
      dto.budgetMax !== undefined ? dto.budgetMax : existing.budgetMax;
    if (
      nextMin !== null &&
      nextMin !== undefined &&
      nextMax !== null &&
      nextMax !== undefined &&
      Number(nextMin) > Number(nextMax)
    ) {
      throwBadRequest(
        "budgetMin cannot exceed budgetMax",
        ERROR_CODES.RECRUITMENT_VALIDATION,
        { budgetMin: nextMin, budgetMax: nextMax },
      );
    }

    const actorUserId = this.requestContext.get()?.userId ?? null;
    const values: Partial<RequisitionValues> = {
      ...(dto.positionId !== undefined ? { positionId: dto.positionId } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.headcount !== undefined ? { headcount: dto.headcount } : {}),
      ...(dto.budgetMin !== undefined ? { budgetMin: dto.budgetMin } : {}),
      ...(dto.budgetMax !== undefined ? { budgetMax: dto.budgetMax } : {}),
      ...(dto.justification !== undefined
        ? { justification: dto.justification }
        : {}),
      updatedBy: actorUserId,
    };

    const updated = await this.requisitionsRepo.update(id, values);
    return RequisitionMapper.toResponse(updated!);
  }
}
