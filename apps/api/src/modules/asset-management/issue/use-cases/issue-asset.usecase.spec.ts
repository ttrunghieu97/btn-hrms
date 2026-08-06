import { Test, type TestingModule } from "@nestjs/testing";
import { IssueAssetUseCase } from "./issue-asset.usecase";
import { AssetIssueRepository } from "../repositories/asset-issue.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("IssueAssetUseCase", () => {
  let repo: jest.Mocked<AssetIssueRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let issueAsset: IssueAssetUseCase;

  beforeEach(async () => {
    repo = {
      findTypeById: jest.fn(),
      findStockByType: jest.fn(),
      findEmployeeById: jest.fn(),
      issue: jest.fn(),
      appendHistory: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueAssetUseCase,
        { provide: AssetIssueRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    issueAsset = module.get(IssueAssetUseCase);
  });

  it("issues asset with sufficient inventory", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 15,
      lowStockThreshold: 5,
    };

    const employee = {
      id: "emp-1",
      name: "John Doe",
      deletedAt: null,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);
    repo.findEmployeeById.mockResolvedValue(employee as any);

    repo.issue.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      issuedAt: new Date(),
      createdAt: new Date(),
      lines: [],
    } as any);

    const result = await issueAsset.execute({
      assetTypeId: "type-1",
      employeeId: "emp-1",
      quantity: 3,
      note: "Equipment for new hire",
    });

    expect(result).toHaveProperty("id", "issue-1");
    expect(repo.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        assetTypeId: "type-1",
        employeeId: "emp-1",
        quantity: 3,
        note: "Equipment for new hire",
        issuedAt: expect.any(Date),
        createdBy: "user-1",
        updatedBy: "user-1",
      }),
      expect.arrayContaining([
        expect.objectContaining({
          assetTypeId: "type-1",
          quantity: 3,
          status: "open",
          note: "Equipment for new hire",
        }),
      ]),
    );
  });

  it("rejects issuing asset with insufficient inventory", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 2,
      lowStockThreshold: 5,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);

    await expect(
      issueAsset.execute({
        assetTypeId: "type-1",
        employeeId: "emp-1",
        quantity: 5,
      }),
    ).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("rejects issuing to non-existent employee", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 15,
      lowStockThreshold: 5,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);
    repo.findEmployeeById.mockResolvedValue(null);

    await expect(
      issueAsset.execute({
        assetTypeId: "type-1",
        employeeId: "non-existent-emp",
        quantity: 3,
      }),
    ).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("validates asset type exists", async () => {
    repo.findTypeById.mockResolvedValue(null);

    await expect(
      issueAsset.execute({
        assetTypeId: "non-existent-type",
        employeeId: "emp-1",
        quantity: 3,
      }),
    ).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("issues asset without note", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 15,
      lowStockThreshold: 5,
    };

    const employee = {
      id: "emp-1",
      name: "John Doe",
      deletedAt: null,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);
    repo.findEmployeeById.mockResolvedValue(employee as any);

    repo.issue.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      issuedAt: new Date(),
      createdAt: new Date(),
      lines: [],
    } as any);

    await issueAsset.execute({
      assetTypeId: "type-1",
      employeeId: "emp-1",
      quantity: 3,
    });

    expect(repo.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        note: undefined,
      }),
      expect.any(Array),
    );
  });

  it("validates employee ID exists", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 15,
      lowStockThreshold: 5,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);
    repo.findEmployeeById.mockResolvedValue(null);

    await expect(
      issueAsset.execute({
        assetTypeId: "type-1",
        employeeId: "non-existent-emp",
        quantity: 3,
      }),
    ).rejects.toThrow();
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("issues multiple assets in single transaction", async () => {
    const type = {
      id: "type-1",
      name: "Mouse",
      deletedAt: null,
    };

    const stock = {
      assetTypeId: "type-1",
      onHand: 50,
      lowStockThreshold: 10,
    };

    const employee = {
      id: "emp-1",
      name: "John Doe",
      deletedAt: null,
    };

    repo.findTypeById.mockResolvedValue(type as any);
    repo.findStockByType.mockResolvedValue(stock as any);
    repo.findEmployeeById.mockResolvedValue(employee as any);

    repo.issue.mockResolvedValue({
      id: "issue-1",
      employeeId: "emp-1",
      issuedAt: new Date(),
      createdAt: new Date(),
      lines: [],
    } as any);

    await issueAsset.execute({
      assetTypeId: "type-1",
      employeeId: "emp-1",
      quantity: 10,
      note: "Bulk purchase",
    });

    expect(repo.issue).toHaveBeenCalled();
    expect(repo.appendHistory).toHaveBeenCalled();
  });
});