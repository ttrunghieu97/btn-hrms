import { Test, type TestingModule } from "@nestjs/testing";
import { CreateAssetTypeUseCase } from "./create-asset-type.usecase";
import { RegisterAssetUseCase } from "./register-asset.usecase";
import { ChangeAssetStatusUseCase } from "./change-asset-status.usecase";
import { AssetCatalogRepository } from "../repositories/asset-catalog.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Asset catalog use-cases", () => {
  let repo: jest.Mocked<AssetCatalogRepository>;
  let createType: CreateAssetTypeUseCase;
  let register: RegisterAssetUseCase;
  let changeStatus: ChangeAssetStatusUseCase;

  beforeEach(async () => {
    repo = {
      findTypeById: jest.fn(),
      findTypeByCode: jest.fn(),
      createType: jest.fn(),
      updateType: jest.fn(),
      listTypes: jest.fn(),
      createStockLevel: jest.fn(),
      findAssetById: jest.fn(),
      findAssetByCode: jest.fn(),
      createAsset: jest.fn(),
      updateAsset: jest.fn(),
      listAssets: jest.fn(),
      appendHistory: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAssetTypeUseCase,
        RegisterAssetUseCase,
        ChangeAssetStatusUseCase,
        { provide: AssetCatalogRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    createType = module.get(CreateAssetTypeUseCase);
    register = module.get(RegisterAssetUseCase);
    changeStatus = module.get(ChangeAssetStatusUseCase);
  });

  it("creates a trackable asset type without a stock level row", async () => {
    repo.findTypeByCode.mockResolvedValue(null);
    repo.createType.mockResolvedValue({ id: "type-1", isTrackable: true } as any);

    await createType.execute({
      name: "Laptop",
      code: "LAPTOP",
      isTrackable: true,
    });

    expect(repo.createType).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LAPTOP", isTrackable: true }),
      expect.any(Object),
    );
    expect(repo.createStockLevel).not.toHaveBeenCalled();
  });

  it("creates a stock level row for quantity-tracked (non-trackable) types", async () => {
    repo.findTypeByCode.mockResolvedValue(null);
    repo.createType.mockResolvedValue({ id: "type-2", isTrackable: false } as any);

    await createType.execute({
      name: "Mouse",
      code: "MOUSE",
      isTrackable: false,
    });

    expect(repo.createStockLevel).toHaveBeenCalledWith(
      expect.objectContaining({ assetTypeId: "type-2", onHand: 0, reserved: 0 }),
      expect.any(Object),
    );
  });

  it("rejects a duplicate asset type code", async () => {
    repo.findTypeByCode.mockResolvedValue({ id: "existing" } as any);

    await expect(
      createType.execute({ name: "Laptop", code: "LAPTOP" } as any),
    ).rejects.toThrow();
    expect(repo.createType).not.toHaveBeenCalled();
  });

  it("rejects registering an asset with a duplicate code", async () => {
    repo.findTypeById.mockResolvedValue({ id: "type-1", deletedAt: null } as any);
    repo.findAssetByCode.mockResolvedValue({ id: "existing" } as any);

    await expect(
      register.execute({
        assetTypeId: "type-1",
        code: "A-001",
        name: "Unit",
      } as any),
    ).rejects.toThrow();
    expect(repo.createAsset).not.toHaveBeenCalled();
  });

  it("appends a created history entry when registering an asset", async () => {
    repo.findTypeById.mockResolvedValue({ id: "type-1", deletedAt: null } as any);
    repo.findAssetByCode.mockResolvedValue(null);
    repo.createAsset.mockResolvedValue({
      id: "asset-1",
      assetTypeId: "type-1",
      status: "available",
    } as any);

    await register.execute({
      assetTypeId: "type-1",
      code: "A-001",
      name: "Unit",
    });

    expect(repo.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({ status: "available" }),
      expect.any(Object),
    );
    expect(repo.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "created", assetId: "asset-1" }),
      expect.any(Object),
    );
  });

  it("allows available -> maintenance and records a maintenance history entry", async () => {
    repo.findAssetById.mockResolvedValue({
      id: "asset-1",
      assetTypeId: "type-1",
      status: "available",
      deletedAt: null,
    } as any);
    repo.updateAsset.mockResolvedValue({
      id: "asset-1",
      status: "maintenance",
    } as any);

    await changeStatus.execute("asset-1", { status: "maintenance" } as any);

    expect(repo.updateAsset).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({ status: "maintenance" }),
      expect.any(Object),
    );
    expect(repo.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "maintenance", assetId: "asset-1" }),
      expect.any(Object),
    );
  });

  it("blocks changing status of a terminal (retired) asset", async () => {
    repo.findAssetById.mockResolvedValue({
      id: "asset-1",
      assetTypeId: "type-1",
      status: "retired",
      deletedAt: null,
    } as any);

    await expect(
      changeStatus.execute("asset-1", { status: "available" } as any),
    ).rejects.toThrow();
    expect(repo.updateAsset).not.toHaveBeenCalled();
  });

  it("records a disposed history entry when retiring an asset", async () => {
    repo.findAssetById.mockResolvedValue({
      id: "asset-1",
      assetTypeId: "type-1",
      status: "available",
      deletedAt: null,
    } as any);
    repo.updateAsset.mockResolvedValue({ id: "asset-1", status: "retired" } as any);

    await changeStatus.execute("asset-1", { status: "retired" } as any);

    expect(repo.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "disposed" }),
      expect.any(Object),
    );
  });
});
