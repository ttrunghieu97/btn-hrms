import { TerminationSchedulerJob } from "./termination-scheduler.job";

describe("TerminationSchedulerJob", () => {
  it("calls processAllDue and logs result", async () => {
    const executeUseCase = {
      processAllDue: jest.fn().mockResolvedValue({ processed: 3 }),
    };
    const job = new TerminationSchedulerJob(executeUseCase as any);

    const loggerSpy = jest.spyOn(job["logger"], "log");
    await job.processDueTerminations();

    expect(executeUseCase.processAllDue).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("3 processed"),
    );
  });

  it("logs error when processAllDue throws", async () => {
    const executeUseCase = {
      processAllDue: jest.fn().mockRejectedValue(new Error("db failure")),
    };
    const job = new TerminationSchedulerJob(executeUseCase as any);

    const loggerSpy = jest.spyOn(job["logger"], "error");
    await job.processDueTerminations();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("db failure"),
    );
  });

  it("processes 0 when nothing is due", async () => {
    const executeUseCase = {
      processAllDue: jest.fn().mockResolvedValue({ processed: 0 }),
    };
    const job = new TerminationSchedulerJob(executeUseCase as any);

    await job.processDueTerminations();
    expect(executeUseCase.processAllDue).toHaveBeenCalled();
  });
});
