import { Test, type TestingModule } from "@nestjs/testing";
import { ReceiveStockUseCase } from "./receive-stock.usecase";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("ReceiveStockUseCase", () => {
  let repo: jest.Mocked<AssetInventoryRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let receiveStock: ReceiveStockUseCase;

  beforeEach(async () => {
    repo = {
      findTypeById: jest.fn(),
      getStockByType: jest.fn(),
      appendHistory: jest.fn(),
      adjustOnHand: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({}));
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveStockUseCase,
        { provide: AssetInventoryRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    receiveStock = module.get(ReceiveStockUseCase);
  });

  it("receives stock with valid parameters", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 15,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
      lowStockThreshold: 5,
    } as any);

    const result = await receiveStock.execute({
      assetTypeId: "type-1",
      quantity: 5,
      note: "New equipment acquisition",
    });

    expect(result).toHaveProperty("assetTypeId", "type-1");
    expect(result).toHaveProperty("quantityAvailable", 15);
    expect(repo.findTypeById).toHaveBeenCalledWith("type-1");
    expect(repo.getStockByType).toHaveBeenCalledWith("type-1");
    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 5, expect.any(Object));
  });

  it("rejects receiving stock for non-existent asset type", async () => {
    repo.findTypeById.mockResolvedValue(null);

    await expect(
      receiveStock.execute({
        assetTypeId: "non-existent-type",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.getStockByType).not.toHaveBeenCalled();
    expect(repo.adjustOnHand).not.toHaveBeenCalled();
  });

  it("rejects receiving stock when asset type is deleted", async () => {
    repo.findTypeById.mockResolvedValue({
      id: "type-1",
      name: "Mouse",
      deletedAt: new Date(),
    } as any);

    await expect(
      receiveStock.execute({
        assetTypeId: "type-1",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.getStockByType).not.toHaveBeenCalled();
    expect(repo.adjustOnHand).not.toHaveBeenCalled();
  });

  it("rejects receiving stock when stock level doesn't exist", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(null);

    await expect(
      receiveStock.execute({
        assetTypeId: "type-1",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.adjustOnHand).not.toHaveBeenCalled();
  });

  it("receives stock with zero quantity", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
      lowStockThreshold: 5,
    } as any);

    const result = await receiveStock.execute({
      assetTypeId: "type-1",
      quantity: 0,
    });

    expect(result).toHaveProperty("assetTypeId", "type-1");
    expect(result).toHaveProperty("quantityAvailable", 10);
    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 0, expect.any(Object));
  });

  it("receives stock with negative quantity (invalid)", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);

    await expect(
      receiveStock.execute({
        assetTypeId: "type-1",
        quantity: -3,
      }),
    ).rejects.toThrow();
    expect(repo.adjustOnHand).not.toHaveBeenCalled();
  });

  it("receives stock without note", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 13,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
      lowStockThreshold: 5,
    } as any);

    await receiveStock.execute({
      assetTypeId: "type-1",
      quantity: 3,
    });

    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 3, expect.any(Object));
  });

  it("receives stock with empty note string", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 10,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 13,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
      lowStockThreshold: 5,
    } as any);

    await receiveStock.execute({
      assetTypeId: "type-1",
      quantity: 3,
      note: "",
    });

    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 3, expect.any(Object));
  });

  it("receives large quantity of stock", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 5,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.getStockByType.mockResolvedValue(stock as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 500,
      quantityAssigned: 0,
      quantityMaintenance: 0,
      quantityLost: 0,
      lowStockThreshold: 50,
    } as any);

    const result = await receiveStock.execute({
      assetTypeId: "type-1",
      quantity: 495,
    });

    expect(result).toHaveProperty("assetTypeId", "type-1");
    expect(result).toHaveProperty("quantityAvailable", 500);
    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 495, expect.any(Object));
  });
});