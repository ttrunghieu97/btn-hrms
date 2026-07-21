import { Test } from "@nestjs/testing";
import { CloseCycleUseCase } from "./close-cycle.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(CloseCycleUseCase.name, () => {
  it("closes a published cycle and stages event", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "published" }), update: jest.fn() } as any;
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) } as any;
    const m = await Test.createTestingModule({ providers: [CloseCycleUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: outbox }] }).compile();
    await m.get(CloseCycleUseCase).execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "closed" });
    expect(outbox.stage).toHaveBeenCalledWith(expect.objectContaining({ eventType: "performance.cycle.closed.v1" }));
  });
  it("rejects close from wrong status", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "draft" }) } as any;
    const m = await Test.createTestingModule({ providers: [CloseCycleUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await expect(m.get(CloseCycleUseCase).execute("c1", "user-1")).rejects.toThrow('Cycle must be in "published" status');
  });
});
