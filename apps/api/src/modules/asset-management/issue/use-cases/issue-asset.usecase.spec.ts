import { Test, type TestingModule } from "@nestjs/testing";
import { IssueAssetUseCase } from "./issue-asset.usecase";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { AssetRequestRepository } from "../../request/repositories/asset-request.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe("IssueAssetUseCase", () => {
  let repo: jest.Mocked<AssetIssueRepository>;
  let requestRepo: jest.Mocked<AssetRequestRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let issueAsset: IssueAssetUseCase;

  beforeEach(async () => {
    repo = {
      createIssue: jest.fn(),
      createLine: jest.fn(),
      findAsset: jest.fn(),
      setAssetStatus: jest.fn(),
      decrementStock: jest.fn(),
      appendHistory: jest.fn(),
      findById: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    requestRepo = {
      findById: jest.fn(),
      markFulfilled: jest.fn(),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    eventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueAssetUseCase,
        { provide: AssetIssueRepository, useValue: repo },
        { provide: AssetRequestRepository, useValue: requestRepo },
        { provide: RequestContextService, useValue: requestContext },
        { provide: EventOutboxService, useValue: eventOutbox },
      ],
    }).compile();

    issueAsset = module.get(IssueAssetUseCase);
  });

  it("issues asset with sufficient inventory", async () => {
    repo.decrementStock.mockResolvedValue(true as any);

    repo.createIssue.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      issuedByUserId: "user-1",
      issuedAt: new Date(),
    } as any);

    repo.createLine.mockResolvedValue({
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 3,
      status: "open",
    } as any);

    repo.findById.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      issuedByUserId: "user-1",
      issuedAt: new Date(),
      lines: [
        {
          id: "line-1",
          issueId: "issue-1",
          assetTypeId: "type-1",
          quantity: 3,
          status: "open",
        },
      ],
    } as any);

    const result = await issueAsset.execute({
      employeeId: "emp-1",
      lines: [{ assetTypeId: "type-1", quantity: 3, note: "Equipment for new hire" }],
      note: "Header note",
    });

    expect(result).toHaveProperty("id", "issue-1");
    expect(repo.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "emp-1",
        issuedByUserId: "user-1",
        note: "Header note",
      }),
      expect.any(Object),
    );
    expect(repo.createLine).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: "issue-1",
        assetTypeId: "type-1",
        quantity: 3,
        status: "open",
      }),
      expect.any(Object),
    );
    expect(repo.appendHistory).toHaveBeenCalled();
  });

  it("rejects issuing asset with insufficient inventory", async () => {
    repo.createIssue.mockResolvedValue({ id: "issue-1" } as any);
    repo.decrementStock.mockResolvedValue(false as any);

    await expect(
      issueAsset.execute({
        employeeId: "emp-1",
        lines: [{ assetTypeId: "type-1", quantity: 5 }],
      }),
    ).rejects.toThrow();
  });

  it("rejects empty lines list", async () => {
    await expect(
      issueAsset.execute({
        employeeId: "emp-1",
        lines: [],
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid line quantity", async () => {
    await expect(
      issueAsset.execute({
        employeeId: "emp-1",
        lines: [{ assetTypeId: "type-1", quantity: 0 }],
      }),
    ).rejects.toThrow();
  });

  it("rejects un-approved request", async () => {
    requestRepo.findById.mockResolvedValue({
      id: "req-1",
      status: "pending_approval",
    } as any);

    await expect(
      issueAsset.execute({
        employeeId: "emp-1",
        requestId: "req-1",
        lines: [{ assetTypeId: "type-1", quantity: 1 }],
      }),
    ).rejects.toThrow();
  });
});