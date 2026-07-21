import { Test } from "@nestjs/testing";
import { CreateOnboardingProcessUseCase } from "./create-onboarding-process.usecase";
import { CreateBoardingProcessUseCase } from "./create-boarding-process.usecase";

describe(CreateOnboardingProcessUseCase.name, () => {
  let useCase: CreateOnboardingProcessUseCase;
  let boardingUseCase: jest.Mocked<Pick<CreateBoardingProcessUseCase, "execute">>;

  const mockResult = {
    id: "proc-1",
    employeeId: "emp-1",
    templateId: "tmpl-1",
    type: "onboarding",
    status: "in_progress",
    startDate: "2026-08-01",
    targetEndDate: null,
    assignedHrUserId: null,
    checklistItems: [
      {
        id: "ci-0",
        title: "Prepare equipment",
        dueDaysOffset: -1,
        mandatory: true,
        dueDate: "2026-07-31",
        isCompleted: false,
        completedAt: null,
        completedByUserID: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    boardingUseCase = { execute: jest.fn().mockResolvedValue(mockResult) };

    const mod = await Test.createTestingModule({
      providers: [
        CreateOnboardingProcessUseCase,
        { provide: CreateBoardingProcessUseCase, useValue: boardingUseCase },
      ],
    }).compile();

    useCase = mod.get(CreateOnboardingProcessUseCase);
  });

  it("should delegate to CreateBoardingProcessUseCase with type=onboarding", async () => {
    const result = await useCase.execute({
      employeeId: "emp-1",
      templateId: "tmpl-1",
    });

    expect(boardingUseCase.execute).toHaveBeenCalledWith({
      employeeId: "emp-1",
      templateId: "tmpl-1",
      type: "onboarding",
      joinDate: undefined,
    });
    expect(result).toEqual(mockResult);
  });

  it("should pass joinDate when provided", async () => {
    await useCase.execute({
      employeeId: "emp-1",
      templateId: "tmpl-1",
      joinDate: "2026-09-15",
    });

    expect(boardingUseCase.execute).toHaveBeenCalledWith({
      employeeId: "emp-1",
      templateId: "tmpl-1",
      type: "onboarding",
      joinDate: "2026-09-15",
    });
  });
});
