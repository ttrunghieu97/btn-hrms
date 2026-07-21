import {
  type TaskWorkflowTasksPort,
  type TaskWorkflowTransaction,
  type WorkflowTaskRecord,
} from "../../../contracts";
import { WorkflowSideEffectsService } from "./workflow-side-effects.service";

function createTasksPort() {
  return {
    findById: jest.fn(),
    updateWithOptimisticLock: jest.fn(),
    addActivity: jest.fn(),
    addAssignment: jest.fn(),
    getUserIdByEmployeeId: jest.fn(),
    getNextSubmissionVersion: jest.fn().mockResolvedValue(2),
    addSubmission: jest.fn(),
    update: jest.fn(),
    createNotification: jest.fn(),
  } as unknown as jest.Mocked<TaskWorkflowTasksPort>;
}

const actor = {
  id: "user-1",
  username: "employee",
  departmentId: null,
  permissions: [],
  roles: ["employee"],
};

describe(WorkflowSideEffectsService.name, () => {
  it("persists a submission and notifies the creator in the same transaction", async () => {
    const tasksRepo = createTasksPort();
    const service = new WorkflowSideEffectsService(tasksRepo);
    const transaction: TaskWorkflowTransaction = {};
    const task: WorkflowTaskRecord = {
      id: "task-1",
      status: "in_progress",
      createdByUserId: "creator-1",
      title: "Quarterly report",
      checklist: JSON.stringify([{ id: "check-1", done: true }]),
      resultText: "Persisted result",
    };

    await service.apply(
      task,
      {
        taskId: task.id,
        actor,
        transition: "submit",
        data: {},
      },
      "submitted",
      transaction,
    );

    expect(tasksRepo.addSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        submittedByUserId: actor.id,
        version: 2,
        resultText: "Persisted result",
        checklist: [{ id: "check-1", done: true }],
      }),
      transaction,
    );
    expect(tasksRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "creator-1",
        taskId: task.id,
        type: "task_submitted",
      }),
      transaction,
    );
  });

  it("stores null when a persisted checklist is malformed", async () => {
    const tasksRepo = createTasksPort();
    const service = new WorkflowSideEffectsService(tasksRepo);
    const task: WorkflowTaskRecord = {
      id: "task-1",
      status: "in_progress",
      checklist: "{invalid",
    };

    await service.apply(
      task,
      {
        taskId: task.id,
        actor,
        transition: "submit",
      },
      "submitted",
      {},
    );

    expect(tasksRepo.addSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ checklist: null }),
      expect.any(Object),
    );
  });
});
