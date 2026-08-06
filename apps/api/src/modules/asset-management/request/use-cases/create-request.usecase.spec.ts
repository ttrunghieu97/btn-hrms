import { Test, type TestingModule } from "@nestjs/testing";
import { CreateRequestUseCase } from "./create-request.usecase";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("CreateRequestUseCase", () => {
  let repo: jest.Mocked<AssetRequestRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let create: CreateRequestUseCase;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRequestUseCase,
        { provide: AssetRequestRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    create = module.get(CreateRequestUseCase);
  });

  it("creates a request with valid lines", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      lines: [
        {
          assetTypeId: "type-1",
          quantity: 5,
        },
        {
          assetTypeId: "type-2",
          quantity: 1,
        },
      ],
    };

    repo.create.mockResolvedValue({
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
    } as any);

    const result = await create.execute(dto);

    expect(result).toHaveProperty("id", "request-1");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterEmployeeId: "emp-1",
        status: "draft",
        createdBy: "user-1",
        updatedBy: "user-1",
      }),
      expect.arrayContaining([
        expect.objectContaining({ assetTypeId: "type-1", quantity: 5 }),
        expect.objectContaining({ assetTypeId: "type-2", quantity: 1 }),
      ]),
    );
  });

  it("rejects empty lines", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      lines: [],
    };

    await expect(create.execute(dto)).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects request without requester employee", async () => {
    const dto = {
      requesterEmployeeId: null,
      lines: [{
        assetTypeId: "type-1",
        quantity: 1,
      }],
    };

    await expect(create.execute(dto)).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("validates line quantity (must be >= 1)", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      lines: [{
        assetTypeId: "type-1",
        quantity: 0,
      }],
    };

    await expect(create.execute(dto)).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("validates line quantity (must be <= 10,000)", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      lines: [{
        assetTypeId: "type-1",
        quantity: 20000,
      }],
    };

    await expect(create.execute(dto)).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("creates request with reason", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      reason: "New project equipment",
      lines: [{
        assetTypeId: "type-1",
        quantity: 5,
      }],
    };

    repo.create.mockResolvedValue({
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "New project equipment",
    } as any);

    await create.execute(dto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "New project equipment",
      }),
      expect.any(Array),
    );
  });

  it("creates request with neededBy date", async () => {
    const dto = {
      requesterEmployeeId: "emp-1",
      neededBy: new Date("2026-09-30"),
      lines: [{
        assetTypeId: "type-1",
        quantity: 5,
      }],
    };

    repo.create.mockResolvedValue({
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      neededBy: new Date("2026-09-30"),
    } as any);

    await create.execute(dto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        neededBy: new Date("2026-09-30"),
      }),
      expect.any(Array),
    );
  });
});
