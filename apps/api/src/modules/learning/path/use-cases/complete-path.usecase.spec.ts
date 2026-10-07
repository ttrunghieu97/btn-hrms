import { CompleteLearningPathUseCase } from "./complete-path.usecase";

describe(CompleteLearningPathUseCase.name, () => {
  it("completes an active path assignment", async () => {
    const repo = {
      findAssignment: jest.fn().mockResolvedValue({ id: "asg-1", pathId: "path-1", employeeId: "emp-1", status: "active" }),
      updateAssignment: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new CompleteLearningPathUseCase(repo as any, eventOutbox as any);
    await useCase.execute("path-1", "emp-1");

    expect(repo.updateAssignment).toHaveBeenCalledWith("asg-1", {
      status: "completed", completedAt: expect.any(Date),
    });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.path.completed.v1" }),
    );
  });

  it("rejects completion of already completed assignment", async () => {
    const repo = {
      findAssignment: jest.fn().mockResolvedValue({ id: "asg-1", status: "completed" }),
    };
    const useCase = new CompleteLearningPathUseCase(repo as any, {} as any);
    await expect(useCase.execute("path-1", "emp-1")).rejects.toThrow("Already completed");
  });

  it("rejects completion when assignment not found", async () => {
    const repo = { findAssignment: jest.fn().mockResolvedValue(null) };
    const useCase = new CompleteLearningPathUseCase(repo as any, {} as any);
    await expect(useCase.execute("path-1", "emp-1")).rejects.toThrow("Assignment not found");
  });
});
