import { Test, type TestingModule } from "@nestjs/testing";
import { GetOnboardingProcessUseCase } from "./get-onboarding-process.usecase";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";
import { NotFoundException } from "@nestjs/common";

describe("GetOnboardingProcessUseCase", () => {
  let useCase: GetOnboardingProcessUseCase;
  let repo: Partial<OnboardingProcessRepository>;

  const mockProcess = {
    id: "proc-1",
    employeeId: "emp-1",
    templateId: null,
    type: "onboarding",
    status: "in_progress",
    startDate: "2026-07-01",
    targetEndDate: null,
    completedAt: null,
    assignedHrUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    checklistItems: [],
  };

  beforeEach(async () => {
    repo = {
      findByIdWithItems: jest.fn().mockResolvedValue(mockProcess),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOnboardingProcessUseCase,
        { provide: OnboardingProcessRepository, useValue: repo },
      ],
    }).compile();

    useCase = module.get(GetOnboardingProcessUseCase);
  });

  it("should return process when found", async () => {
    const result = await useCase.execute("proc-1");
    expect(result).toEqual(mockProcess);
    expect(repo.findByIdWithItems).toHaveBeenCalledWith("proc-1");
  });

  it("should throw NotFoundException when process not found", async () => {
    repo.findByIdWithItems = jest.fn().mockResolvedValue(null);
    await expect(useCase.execute("not-found")).rejects.toThrow(NotFoundException);
  });
});
