import { Test } from "@nestjs/testing";
import { SubmitGoalUseCase } from "./submit-goal.usecase";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(SubmitGoalUseCase.name, () => {
  it("submits a draft goal", async () => {
    const repo = {
      findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "draft", cycleId: "c1" }),
      findAssignmentsByGoal: jest.fn().mockResolvedValue([{ employeeId: "emp-1" }]),
      updateGoal: jest.fn(),
    } as any;
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }, { provide: EventOutboxService, useValue: outbox }],
    }).compile();
    await m.get(SubmitGoalUseCase).execute("g1", "emp-1");
    expect(repo.updateGoal).toHaveBeenCalledWith("g1", { status: "submitted" });
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.goal.submitted.v1" }));
  });
  it("rejects submit of non-draft goal", async () => {
    const repo = { findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "approved" }) } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }],
    }).compile();
    await expect(m.get(SubmitGoalUseCase).execute("g1", "emp-1")).rejects.toThrow("Only draft goals can be submitted");
  });
  it("rejects submit when employee not assigned", async () => {
    const repo = {
      findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "draft" }),
      findAssignmentsByGoal: jest.fn().mockResolvedValue([{ employeeId: "other" }]),
    } as any;
    const m = await Test.createTestingModule({
      providers: [SubmitGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }],
    }).compile();
    await expect(m.get(SubmitGoalUseCase).execute("g1", "emp-1")).rejects.toThrow("Employee not assigned to this goal");
  });
});
