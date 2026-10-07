import { Test, type TestingModule } from "@nestjs/testing";
import { SubmitApplicationUseCase } from "./submit-application.usecase";
import { AttachCvUseCase } from "./attach-cv.usecase";
import { ApplicationsRepository } from "../repositories/applications.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe("Candidate application use-cases", () => {
  let repo: jest.Mocked<ApplicationsRepository>;
  let attachCv: jest.Mocked<AttachCvUseCase>;
  let submit: SubmitApplicationUseCase;

  beforeEach(async () => {
    repo = {
      findPostingById: jest.fn(),
      findCandidateByEmail: jest.fn(),
      createCandidate: jest.fn(),
      findActiveApplication: jest.fn(),
      createApplication: jest.fn(),
      appendStageEvent: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    attachCv = { execute: jest.fn().mockResolvedValue(undefined) } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitApplicationUseCase,
        { provide: ApplicationsRepository, useValue: repo },
        { provide: AttachCvUseCase, useValue: attachCv },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    submit = module.get(SubmitApplicationUseCase);
  });

  const openPosting = { id: "posting-1", status: "open" } as any;

  it("creates an application at 'applied' with an initial stage event", async () => {
    repo.findPostingById.mockResolvedValue(openPosting);
    repo.findCandidateByEmail.mockResolvedValue(null);
    repo.createCandidate.mockResolvedValue({
      id: "cand-1",
      email: "a@b.com",
      fullName: "A",
    } as any);
    repo.findActiveApplication.mockResolvedValue(null);
    repo.createApplication.mockResolvedValue({
      id: "app-1",
      candidateId: "cand-1",
      postingId: "posting-1",
      currentStage: "applied",
    } as any);

    await submit.execute({
      postingId: "posting-1",
      email: "a@b.com",
      fullName: "A",
    });

    expect(repo.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ currentStage: "applied" }),
      expect.any(Object),
    );
    expect(repo.appendStageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ fromStage: null, toStage: "applied" }),
      expect.any(Object),
    );
  });

  it("reuses an existing candidate profile (no duplicate candidate)", async () => {
    repo.findPostingById.mockResolvedValue(openPosting);
    repo.findCandidateByEmail.mockResolvedValue({
      id: "cand-existing",
      email: "a@b.com",
      fullName: "A",
    } as any);
    repo.findActiveApplication.mockResolvedValue(null);
    repo.createApplication.mockResolvedValue({
      id: "app-1",
      candidateId: "cand-existing",
      currentStage: "applied",
    } as any);

    await submit.execute({
      postingId: "posting-1",
      email: "A@B.com",
      fullName: "A",
    });

    expect(repo.createCandidate).not.toHaveBeenCalled();
    expect(repo.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: "cand-existing" }),
      expect.any(Object),
    );
  });

  it("blocks a duplicate active application for the same posting", async () => {
    repo.findPostingById.mockResolvedValue(openPosting);
    repo.findCandidateByEmail.mockResolvedValue({
      id: "cand-1",
      email: "a@b.com",
    } as any);
    repo.findActiveApplication.mockResolvedValue({ id: "app-existing" } as any);

    await expect(
      submit.execute({
        postingId: "posting-1",
        email: "a@b.com",
        fullName: "A",
      } as any),
    ).rejects.toThrow();
    expect(repo.createApplication).not.toHaveBeenCalled();
  });

  it("blocks applying to a posting that is not open", async () => {
    repo.findPostingById.mockResolvedValue({
      id: "posting-1",
      status: "closed",
    } as any);

    await expect(
      submit.execute({
        postingId: "posting-1",
        email: "a@b.com",
        fullName: "A",
      } as any),
    ).rejects.toThrow();
    expect(repo.transaction).not.toHaveBeenCalled();
  });

  it("blocks applying to a posting that does not exist", async () => {
    repo.findPostingById.mockResolvedValue(null);

    await expect(
      submit.execute({
        postingId: "missing",
        email: "a@b.com",
        fullName: "A",
      } as any),
    ).rejects.toThrow();
  });
});
