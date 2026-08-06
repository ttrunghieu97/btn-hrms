import { Test, type TestingModule } from "@nestjs/testing";
import { UpdateRequestUseCase } from "./update-request.usecase";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwBadRequest, throwNotFound, throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("UpdateRequestUseCase", () => {
  let repo: jest.Mocked<AssetRequestRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let updateRequest: UpdateRequestUseCase;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
      submit: jest.fn(),
      cancel: jest.fn(),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateRequestUseCase,
        { provide: AssetRequestRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    updateRequest = module.get(UpdateRequestUseCase);
  });

  it("updates request with valid fields", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      neededBy: new Date("2026-09-30"),
      submittedAt: null,
      decidedAt: null,
      decidedByUserId: null,
      decisionNote: null,
      fulfilledAt: null,
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [
        {
          id: "line-1",
          requestId: "request-1",
          assetTypeId: "type-1",
          quantity: 5,
          note: "Equipment for project",
        },
      ],
    };

    repo.findById.mockResolvedValue(existingRequest as any);
    repo.update.mockResolvedValue({
      ...existingRequest,
      reason: "Updated request",
    } as any);

    const result = await updateRequest.execute({
      id: "request-1",
      reason: "Updated request",
      lines: [
        {
          id: "line-1",
          assetTypeId: "type-1",
          quantity: 5,
        },
      ],
    });

    expect(result).toHaveProperty("id", "request-1");
    expect(result).toHaveProperty("reason", "Updated request");
    expect(repo.update).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        reason: "Updated request",
      }),
      expect.any(Object),
    );
  });

  it("rejects update of non-existent request", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      updateRequest.execute({
        id: "non-existent-request",
        reason: "Updated request",
        lines: [],
      }),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("prevents update of submitted request", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "submitted",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [],
    };

    repo.findById.mockResolvedValue(existingRequest as any);

    await expect(
      updateRequest.execute({
        id: "request-1",
        reason: "Updated request",
        lines: [],
      }),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("validates lines in update", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [],
    };

    repo.findById.mockResolvedValue(existingRequest as any);

    await expect(
      updateRequest.execute({
        id: "request-1",
        reason: "Updated request",
        lines: [
          {
            id: "line-1",
            assetTypeId: "type-1",
            quantity: 0,
          },
        ],
      }),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("validates asset type in update", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [],
    };

    repo.findById.mockResolvedValue(existingRequest as any);

    await expect(
      updateRequest.execute({
        id: "request-1",
        reason: "Updated request",
        lines: [
          {
            id: "line-1",
            assetTypeId: "non-existent-type",
            quantity: 5,
          },
        ],
      }),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates request with null reason (removes reason)", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [],
    };

    repo.findById.mockResolvedValue(existingRequest as any);
    repo.update.mockResolvedValue({
      ...existingRequest,
      reason: null,
    } as any);

    const result = await updateRequest.execute({
      id: "request-1",
      reason: null,
      lines: [],
    });

    expect(result).toHaveProperty("reason", null);
    expect(repo.update).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        reason: null,
      }),
      expect.any(Object),
    );
  });

  it("prevents update of request already submitted", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "submitted",
      reason: "Initial request",
      submittedAt: new Date("2026-08-04"),
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [],
    };

    repo.findById.mockResolvedValue(existingRequest as any);

    await expect(
      updateRequest.execute({
        id: "request-1",
        reason: "Updated request",
        lines: [],
      }),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });
});