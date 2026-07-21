import { UpdateEmployeeUseCase } from "./update-employee.usecase";

const buildUseCase = (overrides: {
  employeesRepo?: any;
  getEmployee?: any;
  resolveAttachmentPlan?: any;
  applyAttachmentPlan?: any;
  positionRepo?: any;
} = {}) => {
  const tx = { insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const employeesRepo = {
    transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
    findEmployeeUserContextByIdentifier: jest.fn().mockResolvedValue({
      employeeId: "e1",
      userId: "u1",
      username: "alice",
    }),
    updateEmployeeById: jest.fn().mockResolvedValue({ id: "e1" }),
    upsertCurrentEmploymentRecord: jest.fn().mockResolvedValue({ id: "er1" }),
    upsertCurrentOrgAssignment: jest.fn().mockResolvedValue({ id: "oa1" }),
    updateUserById: jest.fn().mockResolvedValue(undefined),
    userExistsByUsername: jest.fn().mockResolvedValue(false),
    ...overrides.employeesRepo,
  };
  const getEmployee =
    overrides.getEmployee ?? { execute: jest.fn().mockResolvedValue({ id: "e1" }) };
  const resolveAttachmentPlan =
    overrides.resolveAttachmentPlan ?? { execute: jest.fn().mockReturnValue({}) };
  const applyAttachmentPlan =
    overrides.applyAttachmentPlan ??
    {
      execute: jest.fn().mockImplementation(async (input: any) => {
        await input.mutateInTransaction?.(tx);
      }),
    };
  const positionRepo =
    overrides.positionRepo ?? { getActive: jest.fn().mockResolvedValue(null) };
  const useCase = new UpdateEmployeeUseCase(
    employeesRepo,
    getEmployee,
    { get: jest.fn().mockReturnValue({}) } as any,
    resolveAttachmentPlan,
    applyAttachmentPlan,
    positionRepo,
  );
  return { useCase, employeesRepo, tx };
};

describe(UpdateEmployeeUseCase.name, () => {
  it("rejects when the employee context does not exist", async () => {
    const employeesRepo = {
      transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
      findEmployeeUserContextByIdentifier: jest.fn().mockResolvedValue(null),
    };
    const getEmployee = { execute: jest.fn() };
    const requestContext = {
      get: jest.fn().mockReturnValue({}),
    };

    const useCase = new UpdateEmployeeUseCase(
      employeesRepo as any,
      getEmployee as any,
      requestContext as any,
      { execute: jest.fn().mockReturnValue({}) },
      { execute: jest.fn().mockResolvedValue(undefined) } as any,
      { getActive: jest.fn().mockResolvedValue(null) } as any,
    );

    await expect(useCase.execute("alice", {} as any)).rejects.toThrow();

    expect(employeesRepo.findEmployeeUserContextByIdentifier).toHaveBeenCalledWith("alice");
  });

  it("replaces canonical attachments during update via plan services", async () => {
    const resolveAttachmentPlan = {
      execute: jest.fn().mockReturnValue({
        avatar: { action: "replace", tempFileToken: "tmp-avatar-token" },
        documents: [
          {
            documentType: "resume",
            action: "replace",
            tempFileToken: "tmp-doc-token",
          },
        ],
      }),
    };
    const applyAttachmentPlan = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const { useCase } = buildUseCase({
      resolveAttachmentPlan,
      applyAttachmentPlan,
    });

    await useCase.execute("alice", {
      avatar: { mode: "replace", tempFileToken: "tmp-avatar-token" },
      documents: [{ documentType: "resume", mode: "replace", tempFileToken: "tmp-doc-token" }],
      certifications: [
        {
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          evidence: { mode: "keep", attachmentId: "att-cert" },
        },
      ],
    } as any);

    expect(resolveAttachmentPlan.execute).toHaveBeenCalledWith({
      avatar: { mode: "replace", tempFileToken: "tmp-avatar-token" },
      documents: [{ documentType: "resume", mode: "replace", tempFileToken: "tmp-doc-token" }],
      certifications: [
        {
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          evidence: { mode: "keep", attachmentId: "att-cert" },
        },
      ],
    });
    expect(applyAttachmentPlan.execute).toHaveBeenCalledWith({
      employeeId: "e1",
      mutateInTransaction: expect.any(Function),
      plan: expect.objectContaining({
        avatar: { action: "replace", tempFileToken: "tmp-avatar-token" },
      }),
    });
  });

  it("applies empty attachment plan when upload fields omitted", async () => {
    const resolveAttachmentPlan = { execute: jest.fn().mockReturnValue({}) };
    const applyAttachmentPlan = { execute: jest.fn().mockResolvedValue(undefined) };
    const { useCase } = buildUseCase({
      resolveAttachmentPlan,
      applyAttachmentPlan,
    });

    await useCase.execute("alice", {});

    expect(resolveAttachmentPlan.execute).toHaveBeenCalledWith({
      avatar: undefined,
      documents: undefined,
      certifications: undefined,
    });
    expect(applyAttachmentPlan.execute).toHaveBeenCalledWith({
      employeeId: "e1",
      plan: {},
      mutateInTransaction: expect.any(Function),
    });
  });


});
