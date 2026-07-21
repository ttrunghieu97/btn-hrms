import { Test } from "@nestjs/testing";
import { ScheduleInterviewUseCase } from "./schedule-interview.usecase";
import { InterviewRepository } from "../repositories/interview.repository";
import { ApplicationsRepository } from "../../candidates/repositories/applications.repository";

describe(ScheduleInterviewUseCase.name, () => {
  let useCase: ScheduleInterviewUseCase;
  const interviewRepo = { insert: jest.fn().mockResolvedValue({ id: "i1", applicationId: "a1", title: "Tech Interview", interviewType: "technical", status: "scheduled", scheduledAt: new Date(), durationMinutes: 60 }) };
  const appRepo = { findApplicationById: jest.fn().mockResolvedValue({ id: "a1" }) };

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ScheduleInterviewUseCase,
        { provide: InterviewRepository, useValue: interviewRepo },
        { provide: ApplicationsRepository, useValue: appRepo },
      ],
    }).compile();
    useCase = m.get(ScheduleInterviewUseCase);
  });

  it("schedules interview successfully", async () => {
    const r = await useCase.execute({ applicationId: "a1", title: "Tech Interview", interviewType: "technical", scheduledAt: "2026-07-20T09:00:00Z" }, "user-1");
    expect(r.title).toBe("Tech Interview"); expect(r.status).toBe("scheduled");
  });

  it("rejects schedule for missing application", async () => {
    appRepo.findApplicationById.mockResolvedValue(null);
    await expect(useCase.execute({ applicationId: "a1", title: "T", interviewType: "technical", scheduledAt: "2026-07-20T09:00:00Z" }, "user-1")).rejects.toThrow();
  });
});
