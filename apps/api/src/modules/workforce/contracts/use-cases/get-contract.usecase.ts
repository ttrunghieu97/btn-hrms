import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { ContractListRow } from "../repositories/contract-query.repository";

@Injectable()
export class GetContractUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(id: string): Promise<ContractListRow> {
    const contract = await this.contractQueryRepo.findById(id);
    if (!contract) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id });
    }
    return contract;
  }
}
