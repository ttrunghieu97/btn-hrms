import { CompleteCourseUseCase } from "./complete-course.usecase";

describe(CompleteCourseUseCase.name, () => {
  const baseEnrollment = {
    id: "enr-1", courseId: "c1", employeeId: "emp-1",
    status: "enrolled", progressPercent: 50, completedAt: null,
  };

  it("completes an active enrollment", async () => {
    const repo = {
      findEnrollmentById: jest.fn().mockResolvedValue(baseEnrollment),
      updateEnrollment: jest.fn().mockResolvedValue({ ...baseEnrollment, status: "completed", progressPercent: 100 }),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new CompleteCourseUseCase(repo as any, eventOutbox as any);
    await useCase.execute("enr-1");

    expect(repo.updateEnrollment).toHaveBeenCalledWith(
      "enr-1",
      expect.objectContaining({ status: "completed", progressPercent: 100 }),
    );
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.course.completed.v1" }),
    );
  });

  it("rejects completion of already completed enrollment", async () => {
    const repo = {
      findEnrollmentById: jest.fn().mockResolvedValue({ ...baseEnrollment, status: "completed" }),
    };
    const useCase = new CompleteCourseUseCase(repo as any, {} as any);
    await expect(useCase.execute("enr-1")).rejects.toThrow("Already completed");
  });

  it("rejects completion when enrollment not found", async () => {
    const repo = { findEnrollmentById: jest.fn().mockResolvedValue(null) };
    const useCase = new CompleteCourseUseCase(repo as any, {} as any);
    await expect(useCase.execute("enr-1")).rejects.toThrow("Enrollment not found");
  });
});
