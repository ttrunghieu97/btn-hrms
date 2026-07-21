import { Test } from "@nestjs/testing";
import { StartCalibrationUseCase } from "./start-calibration.usecase";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe(StartCalibrationUseCase.name, () => {
  it("transitions from manager_review to calibration", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "c1", status: "manager_review" }), update: jest.fn() } as any;
    const m = await Test.createTestingModule({ providers: [StartCalibrationUseCase, { provide: PerformanceCycleRepository, useValue: repo }, { provide: EventOutboxService, useValue: {} }] }).compile();
    await m.get(StartCalibrationUseCase).execute("c1", "user-1");
    expect(repo.update).toHaveBeenCalledWith("c1", { status: "calibration" });
  });
});
