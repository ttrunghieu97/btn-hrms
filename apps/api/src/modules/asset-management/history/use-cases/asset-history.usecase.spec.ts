import { Test, type TestingModule } from "@nestjs/testing";
import { GetAssetHistoryUseCase } from "./get-asset-history.usecase";
import { AssetHistoryRepository } from "../repositories/asset-history.repository";

describe("Asset history use-case", () => {
  let repo: jest.Mocked<AssetHistoryRepository>;
  let getHistory: GetAssetHistoryUseCase;

  beforeEach(async () => {
    repo = {
      append: jest.fn(),
      listByAsset: jest.fn(),
      transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAssetHistoryUseCase,
        { provide: AssetHistoryRepository, useValue: repo },
      ],
    }).compile();

    getHistory = module.get(GetAssetHistoryUseCase);
  });

  it("returns entries in chronological order to reconstruct custody", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-02-01T00:00:00Z");
    const t2 = new Date("2026-03-01T00:00:00Z");
    // Repository is responsible for ordering (occurredAt asc); the use-case
    // preserves it. Feed it already-ordered rows and assert the sequence.
    repo.listByAsset.mockResolvedValue([
      { id: "h1", kind: "received", occurredAt: t0, assetId: "asset-1" },
      { id: "h2", kind: "issued", occurredAt: t1, assetId: "asset-1" },
      { id: "h3", kind: "returned", occurredAt: t2, assetId: "asset-1" },
    ] as any);

    const result = await getHistory.execute("asset-1");

    expect(repo.listByAsset).toHaveBeenCalledWith("asset-1");
    expect(result.assetId).toBe("asset-1");
    expect(result.entries.map((e) => e.kind)).toEqual([
      "received",
      "issued",
      "returned",
    ]);
    // Timeline is monotonically non-decreasing.
    const times = result.entries.map((e) => new Date(e.occurredAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("returns an empty timeline for an asset with no history", async () => {
    repo.listByAsset.mockResolvedValue([]);
    const result = await getHistory.execute("asset-2");
    expect(result.entries).toEqual([]);
  });
});
