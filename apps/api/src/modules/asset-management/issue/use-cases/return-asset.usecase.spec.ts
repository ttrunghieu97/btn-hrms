import { Test, type TestingModule } from "@nestjs/testing";
import { ReturnAssetUseCase } from "./return-asset.usecase";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { throwBadRequest, throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("ReturnAssetUseCase", () => {
  let repo: jest.Mocked<AssetIssueRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let requestContext: jest.Mocked<RequestContextService>;
  let returnAsset: ReturnAssetUseCase;

  beforeEach(async () => {
    repo = {
      findLineById: jest.fn(),
      findById: jest.fn(),
      setAssetStatus: jest.fn(),
      incrementStock: jest.fn(),
      closeLine: jest.fn(),
      appendHistory: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    eventOutbox = {
      stage: jest.fn().mockResolvedValue(undefined),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnAssetUseCase,
        { provide: AssetIssueRepository, useValue: repo },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    returnAsset = module.get(ReturnAssetUseCase);
  });

  it("returns stock with full return of non-serialized asset", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    const issue = {
      id: "issue-1",
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);
    repo.findById.mockResolvedValue(issue as any);

    const result = await returnAsset.execute({
      issueLineId: "line-1",
      quantity: 10,
      returnedToUserId: "emp-2",
      condition: "good",
    });

    expect(repo.closeLine).toHaveBeenCalledWith(
      "line-1",
      {
        status: "returned",
        returnedAt: expect.any(Date),
        returnedToUserId: "emp-2",
        condition: "good",
      },
      expect.any(Object),
    );
    expect(repo.incrementStock).toHaveBeenCalledWith("type-1", 10, expect.any(Object));
  });

  it("rejects return of serialized asset in partial quantity", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: "asset-1",
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("returns partial quantity of non-serialized asset", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    const issue = {
      id: "issue-1",
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);
    repo.findById.mockResolvedValue(issue as any);

    const result = await returnAsset.execute({
      issueLineId: "line-1",
      quantity: 5,
      returnedToUserId: "emp-2",
    });

    expect(repo.closeLine).toHaveBeenCalledWith(
      "line-1",
      {
        quantity: 5,
      },
      expect.any(Object),
    );
    expect(repo.incrementStock).toHaveBeenCalledWith("type-1", 5, expect.any(Object));
  });

  it("rejects return quantity below minimum (1)", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 0,
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("rejects return quantity above limit (1,000)", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 2000,
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("returns serialized asset in full", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: "asset-1",
      employeeId: "emp-1",
    };

    const issue = {
      id: "issue-1",
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);
    repo.findById.mockResolvedValue(issue as any);

    await returnAsset.execute({
      issueLineId: "line-1",
      quantity: 10,
    });

    expect(repo.setAssetStatus).toHaveBeenCalledWith(
      "asset-1",
      "available",
      "user-1",
      expect.any(Object),
    );
    expect(repo.closeLine).toHaveBeenCalledWith(
      "line-1",
      {
        status: "returned",
        returnedAt: expect.any(Date),
        returnedToUserId: null,
        condition: null,
      },
      expect.any(Object),
    );
    expect(repo.incrementStock).not.toHaveBeenCalled();
  });

  it("validates line not found", async () => {
    repo.findLineById.mockResolvedValue(null);

    await expect(
      returnAsset.execute({
        issueLineId: "non-existent-line",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("validates line status not open", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "returned", // Not open
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("validates returnedToUserId format", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 5,
        returnedToUserId: 123, // Invalid format
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("validates condition format", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 5,
        condition: 123, // Invalid format
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });

  it("validates condition length", async () => {
    const line = {
      id: "line-1",
      issueId: "issue-1",
      assetTypeId: "type-1",
      quantity: 10,
      status: "open",
      assetId: null,
      employeeId: "emp-1",
    };

    repo.findLineById.mockResolvedValue(line as any);

    await expect(
      returnAsset.execute({
        issueLineId: "line-1",
        quantity: 5,
        condition: "A".repeat(200), // Too long (200 chars, max 100)
      }),
    ).rejects.toThrow();
    expect(repo.closeLine).not.toHaveBeenCalled();
  });
});