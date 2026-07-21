import { Injectable } from "@nestjs/common";
import type {
  AssetHoldingDto,
  IAssetHoldingsReaderPort,
} from "@/contracts/ports/asset-holdings-reader.port";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";

/**
 * Adapter binding {@link IAssetHoldingsReaderPort} to the asset-management issue
 * read model. Other contexts depend only on the port; this is the single place
 * that maps open issue lines into the entity-free {@link AssetHoldingDto}.
 */
@Injectable()
export class AssetHoldingsReaderAdapter implements IAssetHoldingsReaderPort {
  constructor(private readonly issueRepo: AssetIssueRepository) {}

  async findHoldingsByEmployee(
    employeeId: string,
  ): Promise<AssetHoldingDto[]> {
    const byEmployee = await this.findHoldingsByEmployeeIds([employeeId]);
    return byEmployee[employeeId] ?? [];
  }

  async findHoldingsByEmployeeIds(
    employeeIds: string[],
  ): Promise<Record<string, AssetHoldingDto[]>> {
    const rows = await this.issueRepo.findHoldingsByEmployeeIds(employeeIds);
    const result: Record<string, AssetHoldingDto[]> = {};
    for (const id of employeeIds) result[id] = [];
    for (const row of rows) {
      (result[row.employeeId] ??= []).push({
        assetId: row.assetId,
        assetTag: row.assetTag,
        assetTypeName: row.assetTypeName,
        serialNumber: row.serialNumber,
        quantity: row.quantity,
        issuedAt: row.issuedAt.toISOString(),
        expectedReturnAt: null,
        status: row.status,
      });
    }
    return result;
  }
}
