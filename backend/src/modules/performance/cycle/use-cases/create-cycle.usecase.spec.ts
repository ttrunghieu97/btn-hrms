import { CreateCycleUseCase } from "./create-cycle.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { Test } from "@nestjs/testing";

describe(CreateCycleUseCase.name, () => {
  let useCase: CreateCycleUseCase;
  let repo: { insert: jest.Mock };

  beforeAll(async () => {
    repo = { insert: jest.fn().mockResolvedValue({ id: "c1", name: "Q1 Review", status: "draft", startsOn: "2026-01-01", endsOn: "2026-03-31", config: null, createdAt: new Date() }) };
    const m = await Test.createTestingModule({ providers: [CreateCycleUseCase, { provide: PerformanceCycleRepository, useValue: repo }] }).compile();
    useCase = m.get(CreateCycleUseCase);
  });

  it("creates a draft cycle", async () => {
    const r = await useCase.execute({ name: "Q1 Review", startsOn: "2026-01-01", endsOn: "2026-03-31" });
    expect(r.name).toBe("Q1 Review"); expect(r.status).toBe("draft");
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });
  it("rejects missing name", async () => {
    await expect(useCase.execute({ name: "", startsOn: "2026-01-01", endsOn: "2026-03-31" })).rejects.toThrow();
  });
  it("rejects invalid date range", async () => {
    await expect(useCase.execute({ name: "X", startsOn: "2026-06-01", endsOn: "2026-01-01" })).rejects.toThrow();
  });
});