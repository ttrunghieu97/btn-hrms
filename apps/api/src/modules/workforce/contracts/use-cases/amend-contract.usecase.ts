import { Injectable } from "@nestjs/common";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import { throwForbidden, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { UpdateContractDto } from "../dto/contracts.dto";
import type { ContractListRow } from "../repositories/contract-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class AmendContractUseCase {
  constructor(
    private readonly repo: EmployeeContractsRepository,
    private readonly queryRepo: ContractQueryRepository,
  ) {}

  async execute(id: string, dto: UpdateContractDto, scope?: DataScope): Promise<ContractListRow> {
    const existing = await this.queryRepo.findById(id);
    if (!existing) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id });
    }
    if (scope?.tier === "self" && existing.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee contract", ERROR_CODES.PERMISSION_DENIED);
    }
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || existing.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department contract", ERROR_CODES.PERMISSION_DENIED);
    }

    const updated = await this.repo.transaction(async (tx) => {
      return this.repo.amend(
        existing.employeeId,
        {
          contractNumber: dto.contractNumber !== undefined ? dto.contractNumber : existing.contractNumber,
          contractType: dto.contractType ?? (existing.contractType as any),
          effectiveFrom: dto.effectiveFrom ?? existing.effectiveFrom,
          effectiveTo: dto.effectiveTo !== undefined ? dto.effectiveTo : existing.effectiveTo,
          signedAt: dto.signedAt !== undefined ? dto.signedAt : existing.signedAt,
          fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : existing.fileUrl,
          note: dto.note !== undefined ? dto.note : existing.note,
        },
        tx,
      );
    });

    if (!updated) throw new Error("Failed to amend contract");
    const result = await this.queryRepo.findById(updated.id);
    if (!result) throw new Error("Failed to retrieve amended contract");
    return result;
  }
}
