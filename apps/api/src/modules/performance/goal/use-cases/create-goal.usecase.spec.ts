import { Test } from "@nestjs/testing";
import { CreateGoalUseCase } from "./create-goal.usecase";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";
import { PerformanceCycleRepository } from "../../cycle/repositories/performance-cycle.repository";

describe(CreateGoalUseCase.name, () => {
  it("creates a draft goal", async () => {
    const cycleRepo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "planning" }) } as any;
    const goalRepo = { insertGoal: jest.fn().mockResolvedValue({ id: "g1", title: "Goal 1", status: "draft" }), insertAssignment: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [CreateGoalUseCase, { provide: EmployeeGoalRepository, useValue: goalRepo }, { provide: PerformanceCycleRepository, useValue: cycleRepo }] }).compile();
    const r = await m.get(CreateGoalUseCase).execute("c1", { title: "Goal 1" });
    expect(r.title).toBe("Goal 1");
  });
  it("rejects empty title", async () => {
    const cycleRepo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "planning" }) } as any;
    const m = await Test.createTestingModule({ providers: [CreateGoalUseCase, { provide: EmployeeGoalRepository, useValue: {} }, { provide: PerformanceCycleRepository, useValue: cycleRepo }] }).compile();
    await expect(m.get(CreateGoalUseCase).execute("c1", { title: "" } as any)).rejects.toThrow("Goal title is required");
  });
  it("rejects goal creation when cycle not in planning", async () => {
    const cycleRepo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "approved" }) } as any;
    const m = await Test.createTestingModule({ providers: [CreateGoalUseCase, { provide: EmployeeGoalRepository, useValue: {} }, { provide: PerformanceCycleRepository, useValue: cycleRepo }] }).compile();
    await expect(m.get(CreateGoalUseCase).execute("c1", { title: "Goal" } as any)).rejects.toThrow("Cycle must be in planning phase");
  });
});
