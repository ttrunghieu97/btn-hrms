import { Injectable } from "@nestjs/common";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import type { CreateContractDto } from "../dto/contracts.dto";
import type { ContractListRow } from "../repositories/contract-query.repository";
import { ContractQueryRepository } from "../repositories/contract-query.repository";

@Injectable()
export class CreateContractUseCase {
  constructor(
    private readonly repo: EmployeeContractsRepository,
    private readonly queryRepo: ContractQueryRepository,
  ) {}

  async execute(dto: CreateContractDto): Promise<ContractListRow> {
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
    return result;
  }
}
