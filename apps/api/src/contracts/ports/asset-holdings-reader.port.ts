export const ASSET_HOLDINGS_READER_PORT = "ASSET_HOLDINGS_READER_PORT";

/**
 * A single asset an employee currently holds. This is a read-model DTO — the
 * stable, entity-free projection consumed by other contexts (workforce
 * employee-detail, offboarding). Consumers MUST NOT touch asset repositories or
 * see `Asset` / `AssetIssue` / assignment entities; they see only this shape.
 *
 * Holdings are DERIVED from open issue lines. There is no independently mutable
 * "holdings" state and no operation to set them directly — they change only as a
 * consequence of issue / return / transfer / dispose lifecycle operations.
 */
export interface AssetHoldingDto {
  assetId: string | null;
  assetTag: string | null;
  assetTypeName: string;
  serialNumber: string | null;
  quantity: number;
  issuedAt: string;
  expectedReturnAt: string | null;
  status: string;
}

export interface IAssetHoldingsReaderPort {
  /** Current open holdings for one employee. */
  findHoldingsByEmployee(employeeId: string): Promise<AssetHoldingDto[]>;

  /** Current open holdings for many employees, keyed by employeeId. */
  findHoldingsByEmployeeIds(
    employeeIds: string[],
  ): Promise<Record<string, AssetHoldingDto[]>>;
}
