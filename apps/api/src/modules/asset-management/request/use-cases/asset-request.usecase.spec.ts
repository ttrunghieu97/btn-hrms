import { Test, type TestingModule } from "@nestjs/testing";
import { CreateRequestUseCase } from "./create-request.usecase";
import { UpdateRequestUseCase } from "./update-request.usecase";
import { SubmitRequestUseCase } from "./submit-request.usecase";
import { CancelRequestUseCase } from "./cancel-request.usecase";
import { AssetRequestRepository } from "../repositories/asset-request.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Asset request use-cases", () => {
  let repo: jest.Mocked<AssetRequestRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let create: CreateRequestUseCase;
  let update: UpdateRequestUseCase;
  let submit: SubmitRequestUseCase;
  let cancel: CancelRequestUseCase;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      replaceLines: jest.fn(),
      markFulfilled: jest.fn(),
      list: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1", employeeId: "emp-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRequestUseCase,
        UpdateRequestUseCase,
        SubmitRequestUseCase,
        CancelRequestUseCase,
        { provide: AssetRequestRepository, useValue: repo },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    create = module.get(CreateRequestUseCase);
    update = module.get(UpdateRequestUseCase);
    submit = module.get(SubmitRequestUseCase);
    cancel = module.get(CancelRequestUseCase);
  });

  it("creates a draft request with lines", async () => {
    repo.create.mockResolvedValue({
      id: "req-1",
      status: "draft",
      lines: [],
    } as any);
    await create.execute({
      lines: [{ assetTypeId: "type-1", quantity: 2 }],
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "draft",
        requesterEmployeeId: "emp-1",
      }),
      expect.arrayContaining([
        expect.objectContaining({ assetTypeId: "type-1", quantity: 2 }),
      ]),
    );
  });

  it("rejects a request with no lines", async () => {
    await expect(create.execute({ lines: [] } as any)).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects editing a non-draft request", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    await expect(
      update.execute("req-1", { reason: "X" } as any),
    ).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("submits a draft and stages the approval event", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "draft",
      requesterEmployeeId: "emp-1",
      lines: [],
    } as any);
    await submit.execute("req-1");
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({ status: "pending_approval" }),
      expect.any(Object),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "asset.request.approval.requested.v1",
      }),
      expect.any(Object),
    );
  });

  it("blocks submitting a non-draft request", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    await expect(submit.execute("req-1")).rejects.toThrow();
    expect(eventOutbox.stage).not.toHaveBeenCalled();
  });

  it("cancels a pending request", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "pending_approval",
      lines: [],
    } as any);
    await cancel.execute("req-1");
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("blocks cancelling an approved request", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    await expect(cancel.execute("req-1")).rejects.toThrow();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
