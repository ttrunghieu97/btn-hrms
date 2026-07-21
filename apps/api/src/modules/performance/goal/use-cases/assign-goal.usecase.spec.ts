import { Test } from "@nestjs/testing";
import { AssignGoalUseCase } from "./assign-goal.usecase";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";

describe(AssignGoalUseCase.name, () => {
  it("assigns employee to a draft goal", async () => {
    const repo = { findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "draft" }), insertAssignment: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [AssignGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }] }).compile();
    await m.get(AssignGoalUseCase).execute("g1", "emp-1");
    expect(repo.insertAssignment).toHaveBeenCalledWith({ goalId: "g1", employeeId: "emp-1", weight: "1" });
  });
  it("rejects assign of non-draft goal", async () => {
    const repo = { findGoalById: jest.fn().mockResolvedValue({ id: "g1", status: "submitted" }) } as any;
    const m = await Test.createTestingModule({ providers: [AssignGoalUseCase, { provide: EmployeeGoalRepository, useValue: repo }] }).compile();
    await expect(m.get(AssignGoalUseCase).execute("g1", "emp-1")).rejects.toThrow("Can only assign goal in draft status");
  });
});
