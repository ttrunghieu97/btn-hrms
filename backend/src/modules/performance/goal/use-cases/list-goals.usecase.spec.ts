import { Test } from "@nestjs/testing";
import { ListGoalsUseCase } from "./list-goals.usecase";
import { EmployeeGoalRepository } from "../repositories/employee-goal.repository";

describe(ListGoalsUseCase.name, () => {
  it("lists goals by employee", async () => {
    const repo = { findGoalsByCycle: jest.fn().mockResolvedValue([{ id: "g1", title: "Goal 1", status: "draft" }]) } as any;
    const m = await Test.createTestingModule({ providers: [ListGoalsUseCase, { provide: EmployeeGoalRepository, useValue: repo }] }).compile();
    const r = await m.get(ListGoalsUseCase).execute("c1");
    expect(r).toHaveLength(1);
  });
});
