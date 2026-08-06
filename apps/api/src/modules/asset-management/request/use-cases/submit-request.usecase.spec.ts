import { Test, type TestingModule } from "@nestjs/testing";
import { SubmitRequestUseCase } from "./submit-request.usecase";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("SubmitRequestUseCase", () => {
  let repo: jest.Mocked<AssetRequestRepository>;
  let requestContext: jest.Mocked<RequestContextService>;
  let submitRequest: SubmitRequestUseCase;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitRequestUseCase,
        { provide: AssetRequestRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    submitRequest = module.get(SubmitRequestUseCase);
  });

  it("submits request with valid state", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [
        {
          id: "line-1",
          requestId: "request-1",
          assetTypeId: "type-1",
          quantity: 5,
        },
      ],
    };

    repo.findById.mockResolvedValue(existingRequest as any);
    repo.update.mockResolvedValue({
      ...existingRequest,
      status: "submitted",
      submittedAt: new Date("2026-08-04"),
    } as any);

    const result = await submitRequest.execute("request-1");

    expect(result).toHaveProperty("id", "request-1");
    expect(result).toHaveProperty("status", "submitted");
    expect(repo.update).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        status: "submitted",
        submittedAt: expect.any(Date),
      }),
      expect.any(Object),
    );
  });

  it("rejects submission of non-existent request", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(submitRequest.execute("non-existent-request")).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("rejects submission of request already submitted", async () => {
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

    await expect(submitRequest.execute("request-1")).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("validates lines in submit operation", async () => {
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

    await expect(submitRequest.execute("request-1")).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("submits request successfully with all valid data", async () => {
    const existingRequest = {
      id: "request-1",
      requesterEmployeeId: "emp-1",
      status: "draft",
      reason: "Initial request",
      createdAt: new Date("2026-08-04"),
      updatedAt: new Date("2026-08-04"),
      lines: [
        {
          id: "line-1",
          requestId: "request-1",
          assetTypeId: "type-1",
          quantity: 5,
        },
      ],
    };

    repo.findById.mockResolvedValue(existingRequest as any);
    repo.update.mockResolvedValue({
      ...existingRequest,
      status: "submitted",
      submittedAt: new Date("2026-08-04"),
    } as any);

    const result = await submitRequest.execute("request-1");

    expect(result).toHaveProperty("id", "request-1");
    expect(result).toHaveProperty("status", "submitted");
    expect(repo.update).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        status: "submitted",
        submittedAt: expect.any(Date),
      }),
      expect.any(Object),
    );
  });
});