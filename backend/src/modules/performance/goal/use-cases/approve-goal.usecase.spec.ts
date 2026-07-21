import { Test } from "@nestjs/testing";
import { ApproveGoalUseCase } from "./approve-goal.usecase";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(ApproveGoalUseCase.name, () => {
  it("approves a submitted goal", async () => {
    const repo = { findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "submitted", cycleId: "c1" }), updateGoal: jest.fn() } as any;
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) } as any;
    const m = await Test.createTestingModule({ providers: [ApproveGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }, { provide: EventOutboxService, useValue: outbox }] }).compile();
    await m.get(ApproveGoalUseCase).execute("g1", "admin-1");
    expect(repo.updateGoal).toHaveBeenCalledWith("g1", { status: "approved" });
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.goal.approved.v1" }));
  });
  it("rejects approve of non-submitted goal", async () => {
    const repo = { findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "draft" }) } as any;
    const m = await Test.createTestingModule({ providers: [ApproveGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await expect(m.get(ApproveGoalUseCase).execute("g1", "admin-1")).rejects.toThrow("Only submitted goals can be approved");
  });
});
