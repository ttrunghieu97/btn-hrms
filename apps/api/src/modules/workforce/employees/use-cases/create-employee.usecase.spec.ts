jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
}));

import * as bcrypt from "bcrypt";
import { CreateEmployeeUseCase } from "./create-employee.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";

describe(CreateEmployeeUseCase.name, () => {
  it("stages employee created event and applies canonical attachment plan", async () => {
    const tx = {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const contractRepo = {
      create: jest.fn().mockResolvedValue({ id: "ec1" }),
    };
    const employeesRepo = {
      userExistsByUsername: jest.fn().mockResolvedValue(false),
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      insertEmployee: jest.fn().mockResolvedValue({ id: "e1", employeeCode: "EMP001" }),
      insertEmploymentRecord: jest.fn().mockResolvedValue({ id: "er1" }),
      insertOrgAssignment: jest.fn().mockResolvedValue({ id: "oa1" }),
      hardDeleteEmployee: jest.fn(),
    };
    const identityAdmin = {
      createUser: jest.fn().mockResolvedValue({ id: "u1" }),
      deleteUser: jest.fn(),
    };
    const positionReader = {
      getActive: jest.fn().mockResolvedValue(null),
    };
    const getEmployee = {
      execute: jest.fn().mockResolvedValue({ id: "e1", avatar: "legacy-url" }),
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
    };
    const requestContext = {
      get: jest.fn().mockReturnValue({}),
    };
    const resolveAttachmentPlan = {
      execute: jest.fn().mockReturnValue({
        avatar: { action: "replace", tempFileToken: "tmp-avatar-token" },
        documents: [
          {
            documentType: "resume",
            action: "keep",
            currentAttachmentId: "att-doc",
          },
        ],
        certifications: [
          {
            action: "create",
            name: "AWS",
            issuedBy: "Amazon",
            issuedDate: "2026-01-01",
            evidenceAction: "replace",
            tempFileToken: "tmp-cert-token",
          },
        ],
      }),
    };
    const applyAttachmentPlan = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const storage = {
      purgeOwnerFiles: jest.fn().mockResolvedValue(undefined),
    };

    const configService = { get: jest.fn().mockReturnValue("Btn123@") };
    const assignDefaultRole = { execute: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CreateEmployeeUseCase(
      employeesRepo as any,
      getEmployee as any,
      eventOutbox as any,
      requestContext as any,
      positionReader as any,
      identityAdmin as any,
      configService as any,
      assignDefaultRole as any,
      resolveAttachmentPlan,
      applyAttachmentPlan as any,
      storage as any,
      contractRepo as any,
    );

    const result = await useCase.execute({
      firstName: "A",
      lastName: "B",
      username: "ab",
      employeeCode: "EMP001",
      avatar: { mode: "keep", attachmentId: "att-avatar" },
      documents: [{ documentType: "resume", mode: "keep", attachmentId: "att-doc" }],
      certifications: [
        {
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          evidence: { mode: "keep", attachmentId: "att-cert" },
        },
      ],
    } as any);

    expect(assignDefaultRole.execute).toHaveBeenCalledWith("u1");
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "workforce.employee.hired.v1" }),
      tx,
    );
    expect(bcrypt.hash).toHaveBeenCalledWith("Btn123@", 10);
    expect(identityAdmin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "ab",
        email: null,
        isSuperAdmin: false,
      }),
      tx,
    );
    expect(getEmployee.execute).toHaveBeenCalledWith("e1");
    expect(result).toEqual(expect.objectContaining({ id: "e1" }));
  });

  it("still resolves empty attachment plan when payload omits upload fields", async () => {
    const tx = {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const contractRepo = {
      create: jest.fn().mockResolvedValue({ id: "ec1" }),
    };
    const employeesRepo = {
      userExistsByUsername: jest.fn().mockResolvedValue(false),
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      insertEmployee: jest.fn().mockResolvedValue({ id: "e1" }),
      insertEmploymentRecord: jest.fn().mockResolvedValue({ id: "er1" }),
      insertOrgAssignment: jest.fn().mockResolvedValue({ id: "oa1" }),
      hardDeleteEmployee: jest.fn(),
    };
    const identityAdmin = {
      createUser: jest.fn().mockResolvedValue({ id: "u1" }),
    };
    const positionReader = {
      getActive: jest.fn().mockResolvedValue(null),
    };
    const resolveAttachmentPlan = {
      execute: jest.fn().mockReturnValue({}),
    };
    const applyAttachmentPlan = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const storage = {
      purgeOwnerFiles: jest.fn().mockResolvedValue(undefined),
    };

    const configService = { get: jest.fn().mockReturnValue("Btn123@") };
    const assignDefaultRole = { execute: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CreateEmployeeUseCase(
      employeesRepo as any,
      { execute: jest.fn().mockResolvedValue({ id: "e1" }) } as any,
      { stage: jest.fn().mockResolvedValue(undefined) } as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      positionReader as any,
      identityAdmin as any,
      configService as any,
      assignDefaultRole as any,
      resolveAttachmentPlan,
      applyAttachmentPlan as any,
      storage as any,
      contractRepo as any,
    );

    await useCase.execute({
      firstName: "A",
      lastName: "B",
      username: "ab",
    } as any);
  });

  it("cleans up created employee and user when post-commit attachment binding fails", async () => {
    const tx = { name: "tx" };
    const contractRepo = {
      create: jest.fn().mockResolvedValue({ id: "ec1" }),
    };
    const employeesRepo = {
      userExistsByUsername: jest.fn().mockResolvedValue(false),
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      insertEmployee: jest.fn().mockResolvedValue({ id: "e1", employeeCode: "EMP001" }),
      insertEmploymentRecord: jest.fn().mockResolvedValue({ id: "er1" }),
      insertOrgAssignment: jest.fn().mockResolvedValue({ id: "oa1" }),
      hardDeleteEmployee: jest.fn().mockResolvedValue(undefined),
    };
    const identityAdmin = {
      createUser: jest.fn().mockResolvedValue({ id: "u1" }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    };
    const positionReader = {
      getActive: jest.fn().mockResolvedValue(null),
    };
    const applyError = new Error("File token not found");
    const applyAttachmentPlan = {
      execute: jest.fn().mockRejectedValue(applyError),
    };
    const storage = {
      purgeOwnerFiles: jest.fn().mockResolvedValue(undefined),
    };

    const configService = { get: jest.fn().mockReturnValue("Btn123@") };
    const assignDefaultRole = { execute: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CreateEmployeeUseCase(
      employeesRepo as any,
      { execute: jest.fn() } as any,
      { stage: jest.fn().mockResolvedValue(undefined) } as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      positionReader as any,
      identityAdmin as any,
      configService as any,
      assignDefaultRole as any,
      { execute: jest.fn().mockReturnValue({}) },
      applyAttachmentPlan as any,
      storage as any,
      contractRepo as any,
    );

    await expect(
      useCase.execute({
        firstName: "A",
        lastName: "B",
        username: "ab",
        employeeCode: "EMP001",
      } as any),
    ).rejects.toThrow(applyError);
    expect(employeesRepo.hardDeleteEmployee).toHaveBeenCalledWith("e1", tx);
    expect(identityAdmin.deleteUser).toHaveBeenCalledWith("u1", tx);
    expect(storage.purgeOwnerFiles).toHaveBeenCalledWith("employee", "e1");
  });

  it("logs compensation failures and preserves the original post-commit error", async () => {
    const tx = { name: "tx" };
    const contractRepo = {
      create: jest.fn().mockResolvedValue({ id: "ec1" }),
    };
    const employeesRepo = {
      userExistsByUsername: jest.fn().mockResolvedValue(false),
      transaction: jest
        .fn()
        .mockImplementationOnce(async (fn) => fn(tx))
        .mockImplementationOnce(async () => {
          throw new Error("database cleanup failed");
        }),
      insertEmployee: jest.fn().mockResolvedValue({ id: "e1", employeeCode: "EMP001" }),
      insertEmploymentRecord: jest.fn().mockResolvedValue({ id: "er1" }),
      insertOrgAssignment: jest.fn().mockResolvedValue({ id: "oa1" }),
    };
    const identityAdmin = {
      createUser: jest.fn().mockResolvedValue({ id: "u1" }),
      deleteUser: jest.fn(),
    };
    const applyError = new Error("attachment binding failed");
    const logError = jest.spyOn(ContextLogger.prototype, "error").mockImplementation();
    const useCase = new CreateEmployeeUseCase(
      employeesRepo as any,
      { execute: jest.fn() } as any,
      { stage: jest.fn() } as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      { getActive: jest.fn().mockResolvedValue(null) } as any,
      identityAdmin as any,
      { get: jest.fn().mockReturnValue("Btn123@") } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn().mockReturnValue({}) },
      { execute: jest.fn().mockRejectedValue(applyError) } as any,
      {
        purgeOwnerFiles: jest.fn().mockRejectedValue(new Error("storage cleanup failed")),
      } as any,
      contractRepo as any,
    );

    await expect(
      useCase.execute({
        firstName: "A",
        lastName: "B",
        username: "ab",
        employeeCode: "EMP001",
      }),
    ).rejects.toBe(applyError);

    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "employee.create.compensation.database_failed",
        employeeId: "e1",
      }),
    );
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "employee.create.compensation.storage_failed",
        employeeId: "e1",
      }),
    );
    logError.mockRestore();
  });
});
