import { Injectable } from "@nestjs/common";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import { RequisitionsRepository } from "../repositories/requisitions.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetRequisitionUseCase {
  constructor(private readonly requisitionsRepo: RequisitionsRepository) {}

  async execute(id: string) {
    const row = await this.requisitionsRepo.findById(id);
    if (!row) {
      throwNotFound(
        "Requisition not found",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_FOUND,
        { id },
      );
    }
    return RequisitionMapper.toResponse(row);
  }
}
