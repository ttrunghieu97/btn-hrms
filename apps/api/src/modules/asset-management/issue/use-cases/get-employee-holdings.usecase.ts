import { Injectable } from "@nestjs/common";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";

@Injectable()
export class GetEmployeeHoldingsUseCase {
  constructor(private readonly issueRepo: AssetIssueRepository) {}

  async execute(employeeId: string) {
    const lines = await this.issueRepo.findOpenLinesByEmployee(employeeId);
    return {
      employeeId,
      holdings: lines.map((line) => ({
        issueLineId: line.issueLineId,
        issueId: line.issueId,
        assetId: line.assetId,
        assetTypeId: line.assetTypeId,
        quantity: line.quantity,
        status: line.status,
        issuedAt: line.issuedAt,
      })),
    };
  }
}
