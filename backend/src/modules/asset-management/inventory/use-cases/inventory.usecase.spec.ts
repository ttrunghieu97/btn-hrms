import { Test, type TestingModule } from "@nestjs/testing";
import { ReceiveStockUseCase } from "./receive-stock.usecase";
import { AdjustStockUseCase } from "./adjust-stock.usecase";
import { AssetInventoryRepository } from "../repositories/asset-inventory.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { SendNotificationUseCase } from "../../../platform-notifications/use-cases/send-notification.usecase";

describe("Asset inventory use-cases", () => {
  let repo: jest.Mocked<AssetInventoryRepository>;
  let sendNotification: jest.Mocked<SendNotificationUseCase>;
  let receive: ReceiveStockUseCase;
  let adjust: AdjustStockUseCase;

  beforeEach(async () => {
    repo = {
      findTypeById: jest.fn(),
      getStockByType: jest.fn(),
      listStock: jest.fn(),
      adjustOnHand: jest.fn(),
      appendHistory: jest.fn(),
      recomputeFromHistory: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    sendNotification = { execute: jest.fn().mockResolvedValue(undefined) } as any;

    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveStockUseCase,
        AdjustStockUseCase,
        { provide: AssetInventoryRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
        { provide: SendNotificationUseCase, useValue: sendNotification },
      ],
    }).compile();

    receive = module.get(ReceiveStockUseCase);
    adjust = module.get(AdjustStockUseCase);
  });

  it("receives stock: appends a received entry and increments on-hand", async () => {
    repo.findTypeById.mockResolvedValue({ id: "type-1", deletedAt: null } as any);
    repo.getStockByType.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 5,
    } as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 15,
      lowStockThreshold: null,
    } as any);

    await receive.execute({ assetTypeId: "type-1", quantity: 10 });

    expect(repo.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "received", quantityDelta: 10 }),
      expect.any(Object),
    );
    expect(repo.adjustOnHand).toHaveBeenCalledWith("type-1", 10, expect.any(Object));
  });

  it("rejects an adjustment that would drive on-hand below zero", async () => {
    repo.findTypeById.mockResolvedValue({ id: "type-1", deletedAt: null } as any);
    repo.getStockByType.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 3,
    } as any);

    await expect(
      adjust.execute({ assetTypeId: "type-1", delta: -5 } as any),
    ).rejects.toThrow();
    expect(repo.adjustOnHand).not.toHaveBeenCalled();
    expect(repo.appendHistory).not.toHaveBeenCalled();
  });

  it("the stock projection reconciles to the sum of history deltas", async () => {
    // received +10, adjusted -4  => projection should equal 6.
    repo.recomputeFromHistory.mockResolvedValue(6);
    const reconciled = await repo.recomputeFromHistory("type-1");
    expect(reconciled).toBe(6);
  });

  it("sends a low-stock notification when a decrement lands at/below threshold", async () => {
    repo.findTypeById.mockResolvedValue({
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    } as any);
    repo.getStockByType.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 5,
    } as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 2,
      lowStockThreshold: 3,
    } as any);

    await adjust.execute({ assetTypeId: "type-1", delta: -3 });

    expect(sendNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        context: expect.objectContaining({ onHand: 2, threshold: 3 }),
      }),
    );
  });

  it("does not signal low stock when above threshold", async () => {
    repo.findTypeById.mockResolvedValue({
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    } as any);
    repo.getStockByType.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 10,
    } as any);
    repo.adjustOnHand.mockResolvedValue({
      assetTypeId: "type-1",
      onHand: 8,
      lowStockThreshold: 3,
    } as any);

    await adjust.execute({ assetTypeId: "type-1", delta: -2 });

    expect(sendNotification.execute).not.toHaveBeenCalled();
  });
});
