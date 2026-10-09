import { Test } from "@nestjs/testing";
import { CompleteOnboardingTaskUseCase } from "./complete-onboarding-task.usecase";
import { OnboardingProcessRepository } from "../repositories/onboarding-process.repository";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { EventOutboxService } from "../../../core/events/event-outbox.service";

describe(CompleteOnboardingTaskUseCase.name, () => {
  let useCase: CompleteOnboardingTaskUseCase;
  let repo: jest.Mocked<Partial<OnboardingProcessRepository>>;
  let outbox: jest.Mocked<Partial<EventOutboxService>>;

  const mockProcess = {
    id: "proc-1",
    employeeId: "emp-1",
    templateId: "tmpl-1",
    type: "onboarding",
    status: "in_progress",
    startDate: "2026-08-01",
    targetEndDate: null,
    completedAt: null,
    assignedHrUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    checklistItems: [
      {
        id: "item-1",
        title: "Setup laptop",
        dueDaysOffset: 0,
        mandatory: true,
        status: "pending",
        dueDate: null,
        isCompleted: false,
        completedAt: null,
        completedByUserID: null,
      },
      {
        id: "item-2",
        title: "Welcome lunch",
        dueDaysOffset: 1,
        mandatory: false,
        status: "pending",
        dueDate: null,
        isCompleted: false,
        completedAt: null,
        completedByUserID: null,
      },
    ],
  };

  beforeEach(async () => {
    repo = {
      findByIdWithItems: jest.fn().mockResolvedValue(mockProcess),
      updateChecklistItemStatus: jest.fn().mockResolvedValue(undefined),
      updateProcessStatus: jest.fn().mockResolvedValue(undefined),
    };
    outbox = {
      stage: jest.fn().mockResolvedValue(undefined as any),
    };

    const mod = await Test.createTestingModule({
      providers: [
        CompleteOnboardingTaskUseCase,
        { provide: OnboardingProcessRepository, useValue: repo },
        {
          provide: RequestContextService,
          useValue: { get: jest.fn().mockReturnValue({ userId: "user-123" }) },
        },
        { provide: EventOutboxService, useValue: outbox },
      ],
    }).compile();

    useCase = mod.get(CompleteOnboardingTaskUseCase);
  });

  it("completes a checklist item successfully", async () => {
    const result = await useCase.execute({
      processId: "proc-1",
      itemId: "item-1",
      userId: "user-123",
      action: "complete",
      note: "All setup done",
    });

    expect(result.status).toBe("completed");
    expect(result.isCompleted).toBe(true);
    expect(repo.updateChecklistItemStatus).toHaveBeenCalledWith(
      "item-1",
      "completed",
      "user-123",
      "All setup done",
    );
    expect(outbox.stage).toHaveBeenCalled();
  });

  it("skips a non-mandatory item successfully", async () => {
    const result = await useCase.execute({
      processId: "proc-1",
      itemId: "item-2",
      action: "skip",
    });

    expect(result.status).toBe("skipped");
    expect(result.isCompleted).toBe(false);
    expect(outbox.stage).toHaveBeenCalled();
  });

  it("throws error when trying to skip a mandatory item", async () => {
    await expect(
      useCase.execute({
        processId: "proc-1",
        itemId: "item-1",
        action: "skip",
      }),
    ).rejects.toThrow();
  });

  it("stages OnboardingCompletedEvent when all checklist items are finished", async () => {
    repo.findByIdWithItems = jest
      .fn()
      .mockResolvedValueOnce(mockProcess)
      .mockResolvedValueOnce({
        ...mockProcess,
        checklistItems: [
          { ...mockProcess.checklistItems[0], status: "completed" },
          { ...mockProcess.checklistItems[1], status: "completed" },
        ],
      });

    await useCase.execute({
      processId: "proc-1",
      itemId: "item-1",
      action: "complete",
    });

    expect(repo.updateProcessStatus).toHaveBeenCalledWith(
      "proc-1",
      "completed",
      expect.any(Date),
    );
    expect(outbox.stage).toHaveBeenCalledTimes(2);
  });
});

