import { Test } from "@nestjs/testing";
import { GetCycleUseCase } from "./get-cycle.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";

describe(GetCycleUseCase.name, () => {
  it("returns cycle when found", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", name: "Q1", status: "draft" }) } as any;
    const m = await Test.createTestingModule({ providers: [GetCycleUseCase, { provide: PerformanceCycleRepository, useValue: repo }] }).compile();
    const r = await m.get(GetCycleUseCase).execute("c1");
    expect(r.name).toBe("Q1");
  });
  it("throws when not found", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as any;
    const m = await Test.createTestingModule({ providers: [GetCycleUseCase, { provide: PerformanceCycleRepository, useValue: repo }] }).compile();
    await expect(m.get(GetCycleUseCase).execute("missing")).rejects.toThrow("Performance cycle not found");
  });
});
