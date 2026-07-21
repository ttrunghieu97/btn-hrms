import { Test, type TestingModule } from "@nestjs/testing";
import { CreateRequisitionUseCase } from "./create-requisition.usecase";
import { UpdateRequisitionUseCase } from "./update-requisition.usecase";
import { SubmitRequisitionUseCase } from "./submit-requisition.usecase";
import { CloseRequisitionUseCase } from "./close-requisition.usecase";
import { RequisitionsRepository } from "../repositories/requisitions.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Requisition use-cases", () => {
  let repo: jest.Mocked<RequisitionsRepository>;
  let eventOutbox: jest.Mocked<EventOutboxService>;
  let create: CreateRequisitionUseCase;
  let update: UpdateRequisitionUseCase;
  let submit: SubmitRequisitionUseCase;
  let close: CloseRequisitionUseCase;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRequisitionUseCase,
        UpdateRequisitionUseCase,
        SubmitRequisitionUseCase,
        CloseRequisitionUseCase,
        { provide: RequisitionsRepository, useValue: repo },
        { provide: EventOutboxService, useValue: eventOutbox },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    create = module.get(CreateRequisitionUseCase);
    update = module.get(UpdateRequisitionUseCase);
    submit = module.get(SubmitRequisitionUseCase);
    close = module.get(CloseRequisitionUseCase);
  });

  it("creates a draft requisition", async () => {
    repo.create.mockResolvedValue({ id: "req-1", status: "draft" } as any);
    await create.execute({
      departmentId: "dept-1",
      title: "Engineer",
      headcount: 2,
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", headcount: 2 }),
    );
  });

  it("rejects editing a non-draft requisition", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    await expect(update.execute("req-1", { title: "X" } as any)).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("submits a draft and stages the approval event", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "draft",
      departmentId: "dept-1",
    } as any);
    repo.updateStatus.mockResolvedValue({
      id: "req-1",
      status: "pending_approval",
    } as any);
    await submit.execute("req-1");
    expect(repo.updateStatus).toHaveBeenCalledWith(
      "req-1",
      "pending_approval",
      expect.any(Object),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "recruitment.requisition.approval.requested.v1",
      }),
      expect.any(Object),
    );
  });

  it("blocks submitting a non-draft requisition", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    await expect(submit.execute("req-1")).rejects.toThrow();
    expect(eventOutbox.stage).not.toHaveBeenCalled();
  });

  it("blocks closing a terminal requisition", async () => {
    repo.findById.mockResolvedValue({
      id: "req-1",
      status: "closed",
    } as any);
    await expect(close.execute("req-1")).rejects.toThrow();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
