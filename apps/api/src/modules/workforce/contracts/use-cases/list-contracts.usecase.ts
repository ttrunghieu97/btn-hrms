import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import type { ListContractsQueryDto } from "../dto/contracts.dto";
import type { PaginatedContracts } from "../repositories/contract-query.repository";
import type { DataScope } from "../../../../core/security/query-scope.service";

@Injectable()
export class ListContractsUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(query: ListContractsQueryDto, scope?: DataScope): Promise<PaginatedContracts> {
    return this.contractQueryRepo.findPaginated(query, scope);
  }
}

