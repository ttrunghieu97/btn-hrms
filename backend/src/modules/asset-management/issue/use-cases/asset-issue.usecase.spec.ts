import { Test, type TestingModule } from "@nestjs/testing";
import { IssueAssetUseCase } from "./issue-asset.usecase";
import { ReturnAssetUseCase } from "./return-asset.usecase";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { AssetRequestRepository } from "../../request/repositories/asset-request.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { FinalizeAttachmentBindingUseCase } from "../../../storage/use-cases/finalize-attachment-binding.usecase";

describe("Asset issue use-cases", () => {
  let issueRepo: jest.Mocked<AssetIssueRepository>;
  let requestRepo: jest.Mocked<AssetRequestRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let finalize: jest.Mocked<FinalizeAttachmentBindingUseCase>;
  let issue: IssueAssetUseCase;
  let ret: ReturnAssetUseCase;

  beforeEach(async () => {
    issueRepo = {
      createIssue: jest.fn(),
      createLine: jest.fn(),
      findById: jest.fn(),
      findLineById: jest.fn(),
      findAsset: jest.fn(),
      findAssetType: jest.fn(),
      setAssetStatus: jest.fn(),
      findStockLevel: jest.fn(),
      decrementStock: jest.fn(),
      incrementStock: jest.fn(),
      closeLine: jest.fn(),
      appendHistory: jest.fn(),
      findOpenLinesByEmployee: jest.fn(),
      list: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    requestRepo = {
      findById: jest.fn(),
      markFulfilled: jest.fn(),
    } as any;
    eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as any;
    finalize = { execute: jest.fn().mockResolvedValue({}) } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueAssetUseCase,
        ReturnAssetUseCase,
        { provide: AssetIssueRepository, useValue: issueRepo },
        { provide: AssetRequestRepository, useValue: requestRepo },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: requestContext },
        { provide: FinalizeAttachmentBindingUseCase, useValue: finalize },
      ],
    }).compile();

    issue = module.get(IssueAssetUseCase);
    ret = module.get(ReturnAssetUseCase);
  });

  it("issues a serialized asset, sets it assigned and stages the assigned event", async () => {
    issueRepo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    issueRepo.findAsset.mockResolvedValue({
      id: "asset-1",
      status: "available",
      name: "Laptop",
      code: "LAP-1",
      serialNumber: "SN1",
    } as any);
    issueRepo.createLine.mockResolvedValue({ id: "line-1" } as any);
    issueRepo.findById.mockResolvedValue({ id: "issue-1", lines: [] } as any);

    await issue.execute({
      employeeId: "emp-1",
      lines: [{ assetId: "asset-1", assetTypeId: "type-1", quantity: 1 }],
    });

    expect(issueRepo.setAssetStatus).toHaveBeenCalledWith(
      "asset-1",
      "assigned",
      "user-1",
      expect.any(Object),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "asset.assigned.v1" }),
      expect.any(Object),
    );
    expect(issueRepo.appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "issued" }),
      expect.any(Object),
    );
  });

  it("rejects issuing a serialized asset that is not available", async () => {
    issueRepo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    issueRepo.findAsset.mockResolvedValue({
      id: "asset-1",
      status: "retired",
    } as any);

    await expect(
      issue.execute({
        employeeId: "emp-1",
        lines: [{ assetId: "asset-1", assetTypeId: "type-1", quantity: 1 }],
      } as any),
    ).rejects.toThrow();
    expect(issueRepo.setAssetStatus).not.toHaveBeenCalled();
  });

  it("rejects a quantity line with insufficient stock", async () => {
    issueRepo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    issueRepo.decrementStock.mockResolvedValue(null);

    await expect(
      issue.execute({
        employeeId: "emp-1",
        lines: [{ assetTypeId: "type-1", quantity: 5 }],
      } as any),
    ).rejects.toThrow();
  });

  it("supports a direct issue with no request", async () => {
    issueRepo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    issueRepo.decrementStock.mockResolvedValue({ onHand: 3 } as any);
    issueRepo.createLine.mockResolvedValue({ id: "line-1" } as any);
    issueRepo.findById.mockResolvedValue({ id: "issue-1", lines: [] } as any);

    await issue.execute({
      employeeId: "emp-1",
      lines: [{ assetTypeId: "type-1", quantity: 2 }],
    });

    expect(requestRepo.findById).not.toHaveBeenCalled();
    expect(requestRepo.markFulfilled).not.toHaveBeenCalled();
    expect(issueRepo.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: null }),
      expect.any(Object),
    );
  });

  it("fulfils an approved request when issuing against it", async () => {
    requestRepo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    issueRepo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    issueRepo.decrementStock.mockResolvedValue({ onHand: 1 } as any);
    issueRepo.createLine.mockResolvedValue({ id: "line-1" } as any);
    issueRepo.findById.mockResolvedValue({ id: "issue-1", lines: [] } as any);

    await issue.execute({
      employeeId: "emp-1",
      requestId: "req-1",
      lines: [{ assetTypeId: "type-1", quantity: 1 }],
    });

    expect(requestRepo.markFulfilled).toHaveBeenCalledWith(
      "req-1",
      expect.any(Date),
      "user-1",
      expect.any(Object),
    );
  });

  it("blocks issuing against a request that is not approved", async () => {
    requestRepo.findById.mockResolvedValue({
      id: "req-1",
      status: "pending_approval",
    } as any);

    await expect(
      issue.execute({
        employeeId: "emp-1",
        requestId: "req-1",
        lines: [{ assetTypeId: "type-1", quantity: 1 }],
      } as any),
    ).rejects.toThrow();
  });

  it("returns a serialized asset, restoring availability and staging the returned event", async () => {
    issueRepo.findLineById.mockResolvedValue({
      id: "line-1",
      issueId: "issue-1",
      assetId: "asset-1",
      assetTypeId: "type-1",
      quantity: 1,
      status: "open",
    } as any);
    issueRepo.findById.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      lines: [],
    } as any);

    await ret.execute({ issueLineId: "line-1" });

    expect(issueRepo.setAssetStatus).toHaveBeenCalledWith(
      "asset-1",
      "available",
      "user-1",
      expect.any(Object),
    );
    expect(issueRepo.closeLine).toHaveBeenCalledWith(
      "line-1",
      expect.objectContaining({ status: "returned" }),
      expect.any(Object),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "asset.returned.v1" }),
      expect.any(Object),
    );
  });

  it("supports a partial quantity return", async () => {
    issueRepo.findLineById.mockResolvedValue({
      id: "line-1",
      issueId: "issue-1",
      assetId: null,
      assetTypeId: "type-1",
      quantity: 5,
      status: "open",
    } as any);
    issueRepo.findById.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      lines: [],
    } as any);

    await ret.execute({ issueLineId: "line-1", quantity: 2 });

    expect(issueRepo.incrementStock).toHaveBeenCalledWith(
      "type-1",
      2,
      expect.any(Object),
    );
    expect(issueRepo.closeLine).toHaveBeenCalledWith(
      "line-1",
      expect.objectContaining({ quantity: 3 }),
      expect.any(Object),
    );
  });

  it("blocks returning a line that is already returned", async () => {
    issueRepo.findLineById.mockResolvedValue({
      id: "line-1",
      issueId: "issue-1",
      assetId: "asset-1",
      assetTypeId: "type-1",
      quantity: 1,
      status: "returned",
    } as any);

    await expect(ret.execute({ issueLineId: "line-1" } as any)).rejects.toThrow();
  });
});
