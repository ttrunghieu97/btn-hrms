import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { ContractHistoryItemDto } from "../dto/contract-response.dto";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class GetContractHistoryUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(contractId: string, scope?: DataScope): Promise<ContractHistoryItemDto[]> {
    const contract = await this.contractQueryRepo.findById(contractId);
    if (!contract) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id: contractId });
    }
    if (scope?.tier === "self" && contract.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee contract history", ERROR_CODES.PERMISSION_DENIED);
    }
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || contract.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department contract history", ERROR_CODES.PERMISSION_DENIED);
    }
    const history = await this.contractQueryRepo.findHistory(contractId);
    if (history === null) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id: contractId });
    }
    return history;
  }
}

