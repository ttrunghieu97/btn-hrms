import { Test, type TestingModule } from "@nestjs/testing";
import { PublishPostingUseCase } from "./publish-posting.usecase";
import { UpdatePostingUseCase } from "./update-posting.usecase";
import { ChangePostingStatusUseCase } from "./change-posting-status.usecase";
import { PostingsRepository } from "../repositories/postings.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Posting use-cases", () => {
  let repo: jest.Mocked<PostingsRepository>;
  let publish: PublishPostingUseCase;
  let changeStatus: ChangePostingStatusUseCase;

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findRequisitionById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishPostingUseCase,
        UpdatePostingUseCase,
        ChangePostingStatusUseCase,
        { provide: PostingsRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    publish = module.get(PublishPostingUseCase);
    changeStatus = module.get(ChangePostingStatusUseCase);
  });

  it("blocks publishing when the requisition is not approved", async () => {
    repo.findRequisitionById.mockResolvedValue({
      id: "req-1",
      status: "pending_approval",
    } as any);
    await expect(
      publish.execute({ requisitionId: "req-1", title: "Engineer" } as any),
    ).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("publishes an open posting from an approved requisition", async () => {
    repo.findRequisitionById.mockResolvedValue({
      id: "req-1",
      status: "approved",
    } as any);
    repo.create.mockResolvedValue({ id: "post-1", status: "open" } as any);
    await publish.execute({
      requisitionId: "req-1",
      title: "Engineer",
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "open", requisitionId: "req-1" }),
    );
  });

  it("treats closing as terminal — a change from closed throws", async () => {
    repo.findById.mockResolvedValue({
      id: "post-1",
      status: "closed",
    } as any);
    await expect(changeStatus.execute("post-1", "open")).rejects.toThrow();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("allows a paused posting to reopen", async () => {
    repo.findById.mockResolvedValue({
      id: "post-1",
      status: "paused",
    } as any);
    repo.updateStatus.mockResolvedValue({
      id: "post-1",
      status: "open",
    } as any);
    await changeStatus.execute("post-1", "open");
    expect(repo.updateStatus).toHaveBeenCalledWith("post-1", "open");
  });
});
