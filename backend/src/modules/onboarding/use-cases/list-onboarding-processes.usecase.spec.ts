import { Test, type TestingModule } from "@nestjs/testing";
import { ListOnboardingProcessesUseCase } from "./list-onboarding-processes.usecase";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";

describe("ListOnboardingProcessesUseCase", () => {
  let useCase: ListOnboardingProcessesUseCase;
  let repo: Partial<OnboardingProcessRepository>;

  beforeEach(async () => {
    repo = {
      findByType: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOnboardingProcessesUseCase,
        { provide: OnboardingProcessRepository, useValue: repo },
      ],
    }).compile();

    useCase = module.get(ListOnboardingProcessesUseCase);
  });

  it("should call repository with onboarding type", async () => {
    await useCase.execute(1, 20);
    expect(repo.findByType).toHaveBeenCalledWith("onboarding", 1, 20);
  });

  it("should return empty list when no processes exist", async () => {
    const result = await useCase.execute(1, 20);
    expect(result).toEqual({ rows: [], total: 0 });
  });
});
