import { Test } from "@nestjs/testing";
import { ListCyclesUseCase } from "./list-cycles.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";

describe(ListCyclesUseCase.name, () => {
  it("returns all cycles", async () => {
    const repo = { findMany: jest.fn().mockResolvedValue([{ id: "c1", name: "Q1", status: "draft" }]) } as any;
    const m = await Test.createTestingModule({ providers: [ListCyclesUseCase, { provide: PerformanceCycleRepository, useValue: repo }] }).compile();
    const r = await m.get(ListCyclesUseCase).execute();
    expect(r).toHaveLength(1);
  });
  it("returns empty list when no cycles", async () => {
    const repo = { findMany: jest.fn().mockResolvedValue([]) } as any;
    const m = await Test.createTestingModule({ providers: [ListCyclesUseCase, { provide: PerformanceCycleRepository, useValue: repo }] }).compile();
    const r = await m.get(ListCyclesUseCase).execute();
    expect(r).toEqual([]);
  });
});
