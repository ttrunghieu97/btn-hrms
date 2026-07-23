import { Injectable } from "@nestjs/common";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import type { AssetHoldingDto } from "@/contracts/ports/asset-holdings-reader.port";

@Injectable()
export class GetEmployeeHoldingsUseCase {
  constructor(private readonly issueRepo: AssetIssueRepository) {}

  async execute(
    employeeId: string,
  ): Promise<{ employeeId: string; holdings: AssetHoldingDto[] }> {
    const rows = await this.issueRepo.findHoldingsByEmployeeIds([employeeId]);
    const holdings: AssetHoldingDto[] = rows.map((row) => ({
      assetId: row.assetId,
      assetTag: row.assetTag,
      assetTypeName: row.assetTypeName,
      serialNumber: row.serialNumber,
      quantity: row.quantity,
      issuedAt: row.issuedAt.toISOString(),
      expectedReturnAt: null,
      status: row.status,
    }));
    return { employeeId, holdings };
  }
}
