import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import type { ListContractsQueryDto } from "../dto/contracts.dto";
import type { PaginatedContracts } from "../repositories/contract-query.repository";

@Injectable()
export class ListContractsUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(query: ListContractsQueryDto): Promise<PaginatedContracts> {
    return this.contractQueryRepo.findPaginated(query);
  }
}
