import { Injectable } from "@nestjs/common";
import { ContractQueryRepository } from "../repositories/contract-query.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import type { ContractHistoryItemDto } from "../dto/contract-response.dto";

@Injectable()
export class GetContractHistoryUseCase {
  constructor(
    private readonly contractQueryRepo: ContractQueryRepository,
  ) {}

  async execute(contractId: string): Promise<ContractHistoryItemDto[]> {
    const history = await this.contractQueryRepo.findHistory(contractId);
    if (history === null) {
      throwNotFound("Contract not found", ERROR_CODES.CONTRACT_NOT_FOUND, { id: contractId });
    }
    return history;
  }
}
