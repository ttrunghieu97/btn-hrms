import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { ContractListRow } from "../repositories/contract-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class GetContractUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(id: string, scope?: DataScope): Promise<ContractListRow> {
    const contract = await this.contractQueryRepo.findById(id);
    if (!contract) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id });
    }
    if (scope?.tier === "self" && contract.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee contract", ERROR_CODES.PERMISSION_DENIED);
    }
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || contract.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department contract", ERROR_CODES.PERMISSION_DENIED);
    }
    return contract;
  }
}

