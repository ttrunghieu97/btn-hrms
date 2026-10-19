import { Injectable } from "@nestjs/common";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { throwForbidden } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { CreateContractDto } from "../dto/contracts.dto";
import type { ContractListRow } from "../repositories/contract-query.repository";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class CreateContractUseCase {
  constructor(
    private readonly repo: EmployeeContractsRepository,
    private readonly queryRepo: ContractQueryRepository,
  ) {}

  async execute(dto: CreateContractDto, scope?: DataScope): Promise<ContractListRow> {
    if (scope?.tier === "self" && dto.employeeId !== scope.employeeId) {
      throwForbidden("Access denied to out-of-scope employee contract", ERROR_CODES.PERMISSION_DENIED);
    }
    if (scope?.tier === "department") {
      if (!scope.departmentId) {
        throwForbidden("Access denied to out-of-scope department contract", ERROR_CODES.PERMISSION_DENIED);
      }
      if (typeof this.queryRepo.findEmployeeDepartmentId === "function") {
        const empDeptId = await this.queryRepo.findEmployeeDepartmentId(dto.employeeId);
        if (empDeptId !== scope.departmentId) {
          throwForbidden("Access denied to out-of-scope department contract", ERROR_CODES.PERMISSION_DENIED);
        }
      }
    }

    const created = await this.repo.transaction(async (tx) => {
      const row = await this.repo.create(
        {
          employeeId: dto.employeeId,
          contractNumber: dto.contractNumber ?? null,
          contractType: dto.contractType,
          effectiveFrom: dto.effectiveFrom,
          effectiveTo: dto.effectiveTo ?? null,
          signedAt: dto.signedAt ?? null,
          fileUrl: dto.fileUrl ?? null,
          note: dto.note ?? null,
        },
        tx,
      );
      return row;
    });

    const result = await this.queryRepo.findById(created!.id);
    if (!result) throw new Error("Failed to retrieve created contract");
    if (
      scope?.tier === "department" &&
      (!scope.departmentId || result.departmentId !== scope.departmentId)
    ) {
      throwForbidden("Access denied to out-of-scope department contract", ERROR_CODES.PERMISSION_DENIED);
    }
    return result;
  }
}
