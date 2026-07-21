import { Test, type TestingModule } from "@nestjs/testing";
import { AdvanceStageUseCase } from "./advance-stage.usecase";
import { CloseApplicationUseCase } from "./close-application.usecase";
import { RejectApplicationUseCase } from "./reject-application.usecase";
import { SubmitScorecardUseCase } from "./submit-scorecard.usecase";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { isAllowedTransition } from "../domain/stage-transitions";

describe("stage-transitions helper", () => {
  it("allows the forward path but not skips", () => {
    expect(isAllowedTransition("applied", "screening")).toBe(true);
    expect(isAllowedTransition("screening", "interview")).toBe(true);
    expect(isAllowedTransition("interview", "offer")).toBe(true);
    expect(isAllowedTransition("offer", "hired")).toBe(true);
    expect(isAllowedTransition("applied", "hired")).toBe(false);
    expect(isAllowedTransition("applied", "interview")).toBe(false);
  });

  it("allows reject/withdraw from any active stage but not from terminal", () => {
    expect(isAllowedTransition("applied", "rejected")).toBe(true);
    expect(isAllowedTransition("offer", "withdrawn")).toBe(true);
    expect(isAllowedTransition("hired", "rejected")).toBe(false);
    expect(isAllowedTransition("rejected", "withdrawn")).toBe(false);
  });
});

describe("Pipeline use-cases", () => {
  let repo: jest.Mocked<ApplicationsRepository>;
  let advance: AdvanceStageUseCase;
  let reject: RejectApplicationUseCase;
  let scorecard: SubmitScorecardUseCase;

  beforeEach(async () => {
    repo = {
      findApplicationById: jest.fn(),
      updateApplicationStage: jest.fn(),
      appendStageEvent: jest.fn(),
      createScorecard: jest.fn(),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
    } as any;
    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "user-1" }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvanceStageUseCase,
        CloseApplicationUseCase,
        RejectApplicationUseCase,
        SubmitScorecardUseCase,
        { provide: ApplicationsRepository, useValue: repo },
        { provide: RequestContextService, useValue: requestContext },
      ],
    }).compile();

    advance = module.get(AdvanceStageUseCase);
    reject = module.get(RejectApplicationUseCase);
    scorecard = module.get(SubmitScorecardUseCase);
  });

  it("throws on a disallowed transition (applied -> hired)", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "applied",
    } as any);
    await expect(
      advance.execute("app-1", { toStage: "hired" } as any),
    ).rejects.toThrow();
    expect(repo.updateApplicationStage).not.toHaveBeenCalled();
  });

  it("updates the stage and appends an event on an allowed transition", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "applied",
    } as any);
    repo.updateApplicationStage.mockResolvedValue({
      id: "app-1",
      currentStage: "screening",
    } as any);

    await advance.execute("app-1", { toStage: "screening" } as any);

    expect(repo.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "screening",
      expect.any(Object),
    );
    expect(repo.appendStageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ fromStage: "applied", toStage: "screening" }),
      expect.any(Object),
    );
  });

  it("rejects an application from an active stage", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "interview",
    } as any);
    repo.updateApplicationStage.mockResolvedValue({
      id: "app-1",
      currentStage: "rejected",
    } as any);

    await reject.execute("app-1", {});

    expect(repo.updateApplicationStage).toHaveBeenCalledWith(
      "app-1",
      "rejected",
      expect.any(Object),
    );
  });

  it("blocks rejecting an application already in a terminal stage", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "hired",
    } as any);
    await expect(reject.execute("app-1", {} as any)).rejects.toThrow();
    expect(repo.updateApplicationStage).not.toHaveBeenCalled();
  });

  it("blocks a scorecard outside the interview stage", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "screening",
    } as any);
    await expect(
      scorecard.execute("app-1", { rating: 4 } as any),
    ).rejects.toThrow();
    expect(repo.createScorecard).not.toHaveBeenCalled();
  });

  it("creates a scorecard while in the interview stage", async () => {
    repo.findApplicationById.mockResolvedValue({
      id: "app-1",
      currentStage: "interview",
    } as any);
    repo.createScorecard.mockResolvedValue({
      id: "sc-1",
      applicationId: "app-1",
      interviewerUserId: "user-1",
      rating: 4,
    } as any);

    await scorecard.execute("app-1", { rating: 4 });

    expect(repo.createScorecard).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "app-1",
        interviewerUserId: "user-1",
        rating: 4,
      }),
    );
  });
});
