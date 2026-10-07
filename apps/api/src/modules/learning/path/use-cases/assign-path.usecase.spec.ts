import { AssignLearningPathUseCase } from "./assign-path.usecase";

describe(AssignLearningPathUseCase.name, () => {
  it("assigns published path to employees", async () => {
    const repo = {
      findPathById: jest.fn().mockResolvedValue({ id: "path-1", status: "published" }),
      insertAssignment: jest.fn().mockResolvedValueOnce({ id: "asg-1" }).mockResolvedValueOnce({ id: "asg-2" }),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new AssignLearningPathUseCase(repo as any, eventOutbox as any);
    await useCase.execute({ pathId: "path-1", employeeIds: ["emp-1", "emp-2"] }, "admin-1");

    expect(repo.insertAssignment).toHaveBeenCalledTimes(2);
    expect(eventOutbox.stage).toHaveBeenCalledTimes(2);
  });

  it("rejects assignment of draft path", async () => {
    const repo = { findPathById: jest.fn().mockResolvedValue({ id: "path-1", status: "draft" }) };
    const useCase = new AssignLearningPathUseCase(repo as any, {} as any);
    await expect(
      useCase.execute({ pathId: "path-1", employeeIds: ["emp-1"] }, "admin-1"),
    ).rejects.toThrow("Only published paths can be assigned");
  });
});
