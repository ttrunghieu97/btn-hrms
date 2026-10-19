import { CreateTaskTemplateUseCase } from "./create-task-template.usecase";
import { ListTaskTemplatesUseCase } from "./list-task-templates.usecase";
import { GetTaskTemplateUseCase } from "./get-task-template.usecase";
import { UpdateTaskTemplateUseCase } from "./update-task-template.usecase";
import { DeleteTaskTemplateUseCase } from "./delete-task-template.usecase";
import { InstantiateTaskTemplateUseCase } from "./instantiate-task-template.usecase";

describe("TaskTemplates UseCases", () => {
  const repo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateTaskTemplateLink: jest.fn(),
  };
  const createTaskUseCase = {
    execute: jest.fn(),
  };

  const createUseCase = new CreateTaskTemplateUseCase(repo as never);
  const listUseCase = new ListTaskTemplatesUseCase(repo as never);
  const getUseCase = new GetTaskTemplateUseCase(repo as never);
  const updateUseCase = new UpdateTaskTemplateUseCase(repo as never);
  const deleteUseCase = new DeleteTaskTemplateUseCase(repo as never);
  const instantiateUseCase = new InstantiateTaskTemplateUseCase(
    getUseCase,
    repo as never,
    createTaskUseCase as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates and lists task templates", async () => {
    repo.create.mockResolvedValue({
      id: "tpl-1",
      title: "Monthly Payroll Audit",
      createdByUserId: "u-hr",
    });
    repo.findAll.mockResolvedValue([{ id: "tpl-1", title: "Monthly Payroll Audit" }]);

    const created = await createUseCase.execute(
      { title: "Monthly Payroll Audit", priority: "high" as never },
      "u-hr",
    );
    expect(created?.id).toBe("tpl-1");
    expect(repo.create).toHaveBeenCalledWith({
      title: "Monthly Payroll Audit",
      priority: "high",
      createdByUserId: "u-hr",
    });

    const all = await listUseCase.execute();
    expect(all).toHaveLength(1);
  });

  it("throws 404 NotFound when getting, updating, or deleting a non-existent template", async () => {
    repo.findById.mockResolvedValue(null);
    repo.update.mockResolvedValue(null);
    repo.delete.mockResolvedValue(null);

    await expect(getUseCase.execute("tpl-404")).rejects.toThrow(
      /Task template not found/i,
    );
    await expect(
      updateUseCase.execute("tpl-404", { title: "Updated" }),
    ).rejects.toThrow(/Task template not found/i);
    await expect(deleteUseCase.execute("tpl-404")).rejects.toThrow(
      /Task template not found/i,
    );
  });

  it("instantiates a task from a template, applying overrides and linking templateId", async () => {
    repo.findById.mockResolvedValue({
      id: "tpl-1",
      title: "New Hire IT Provisioning",
      description: "Provision laptop and SSO account",
      defaultAssigneeId: "emp-it-default",
      priority: "medium",
      checklist: [{ id: "c1", text: "Issue MacBook", done: false }],
    });
    createTaskUseCase.execute.mockResolvedValue({
      id: "task-99",
      title: "Custom Provisioning for Alice",
      assigneeId: "emp-it-alice",
    });

    const instantiated = await instantiateUseCase.execute(
      "tpl-1",
      {
        title: "Custom Provisioning for Alice",
        assigneeId: "emp-it-alice",
      },
      "u-hr",
    );

    expect(createTaskUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Custom Provisioning for Alice",
        description: "Provision laptop and SSO account",
        assigneeId: "emp-it-alice",
        priority: "medium",
      }),
      "u-hr",
    );
    expect(repo.updateTaskTemplateLink).toHaveBeenCalledWith("task-99", "tpl-1");
    expect(instantiated).toEqual({
      id: "task-99",
      title: "Custom Provisioning for Alice",
      assigneeId: "emp-it-alice",
      templateId: "tpl-1",
    });
  });
});
