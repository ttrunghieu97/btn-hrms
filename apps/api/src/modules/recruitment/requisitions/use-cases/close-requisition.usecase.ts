import { Injectable } from "@nestjs/common";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import { RequisitionsRepository } from "../repositories/requisitions.repository";
import { throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

const TERMINAL_STATUSES = ["rejected", "closed"] as const;

@Injectable()
export class CloseRequisitionUseCase {
  constructor(private readonly requisitionsRepo: RequisitionsRepository) {}

  async execute(id: string) {
    const existing = await this.requisitionsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        "Requisition not found",
        ERROR_CODES.RECRUITMENT_REQUISITION_NOT_FOUND,
        { id },
      );
    }
    if (
      TERMINAL_STATUSES.includes(
        existing.status as (typeof TERMINAL_STATUSES)[number],
      )
    ) {
      throwConflict(
        "Requisition is already in a terminal state",
        ERROR_CODES.RECRUITMENT_INVALID_STATUS,
        { id, status: existing.status },
      );
    }

    const updated = await this.requisitionsRepo.updateStatus(id, "closed");
    return RequisitionMapper.toResponse(updated!);
  }
}
