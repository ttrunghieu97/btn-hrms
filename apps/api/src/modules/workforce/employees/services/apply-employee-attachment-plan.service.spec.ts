import { ApplyEmployeeAttachmentPlanService } from "./apply-employee-attachment-plan.service";
import type { EmployeesRepository } from "../repositories/employees.repository";

describe(ApplyEmployeeAttachmentPlanService.name, () => {
  const tx = { name: "tx" } as any;

  const employeesRepo = {
    transaction: jest.fn(async (fn: (trx: any) => Promise<void>) => fn(tx)),
    replaceEmployeeAvatar: jest.fn(),
  } as unknown as jest.Mocked<EmployeesRepository>;

  const documentRepo = {
    replaceEmployeeDocuments: jest.fn(),
  };

  const certRepo = {
    replaceEmployeeCertifications: jest.fn(),
  };

  let service: ApplyEmployeeAttachmentPlanService;
  const finalizeAttachmentBinding = {
    execute: jest.fn(),
  };
  const storage = {
    getFileById: jest.fn(),
    deleteFiles: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storage.getFileById.mockResolvedValue({
      status: "active",
      ownerType: "employee",
      ownerId: "emp-1",
      purpose: "avatar",
    });
    service = new ApplyEmployeeAttachmentPlanService(
      employeesRepo,
      documentRepo as any,
      certRepo as any,
      finalizeAttachmentBinding as any,
      storage as any,
    );
  });

  it("removes avatar when plan says remove", async () => {
    await service.execute({
      employeeId: "emp-1",
      plan: {
        avatar: { action: "remove", currentAttachmentId: "att-old" },
      },
    });

    expect(employeesRepo.replaceEmployeeAvatar).toHaveBeenCalledWith("emp-1", null, tx);
  });

  it("keeps existing avatar when plan says keep", async () => {
    await service.execute({
      employeeId: "emp-1",
      plan: {
        avatar: { action: "keep", currentAttachmentId: "att-avatar" },
      },
    });

    expect(employeesRepo.replaceEmployeeAvatar).not.toHaveBeenCalled();
  });

  it("finalizes a staged avatar before binding it", async () => {
    finalizeAttachmentBinding.execute.mockResolvedValue({
      attachmentId: "att-new",
    });

    await service.execute({
      employeeId: "emp-1",
      plan: {
        avatar: {
          action: "replace",
          tempFileToken: "tmp-avatar",
          currentAttachmentId: "att-old",
        },
      },
    });

    expect(finalizeAttachmentBinding.execute).toHaveBeenCalledWith({
      fileToken: "tmp-avatar",
      ownerType: "employee",
      ownerId: "emp-1",
      purpose: "avatar",
    });
    expect(employeesRepo.replaceEmployeeAvatar).toHaveBeenCalledWith("emp-1", "att-new", tx);
    expect(storage.deleteFiles).toHaveBeenCalledWith(["att-old"]);
  });

  it("rejects a kept attachment owned by another employee", async () => {
    storage.getFileById.mockResolvedValue({
      status: "active",
      ownerType: "employee",
      ownerId: "emp-2",
      purpose: "avatar",
    });

    await expect(
      service.execute({
        employeeId: "emp-1",
        plan: {
          avatar: { action: "keep", currentAttachmentId: "att-foreign" },
        },
      }),
    ).rejects.toThrow("Attachment does not belong to employee");

    expect(employeesRepo.transaction).not.toHaveBeenCalled();
  });

  it("archives finalized files when relation transaction fails", async () => {
    finalizeAttachmentBinding.execute.mockResolvedValue({
      attachmentId: "att-new",
    });
    employeesRepo.transaction.mockRejectedValueOnce(new Error("db failed"));

    await expect(
      service.execute({
        employeeId: "emp-1",
        plan: {
          avatar: { action: "replace", tempFileToken: "tmp-avatar" },
        },
      }),
    ).rejects.toThrow("db failed");

    expect(storage.deleteFiles).toHaveBeenCalledWith(["att-new"]);
  });

  it("replaces documents and certifications from mixed keep/remove plan", async () => {
    storage.getFileById
      .mockResolvedValueOnce({
        status: "active",
        ownerType: "employee",
        ownerId: "emp-1",
        purpose: "document",
      })
      .mockResolvedValueOnce({
        status: "active",
        ownerType: "employee",
        ownerId: "emp-1",
        purpose: "certification",
      });
    await service.execute({
      employeeId: "emp-1",
      plan: {
        documents: [
          { documentType: "resume", action: "keep", currentAttachmentId: "att-resume" },
          { documentType: "jobApplication", action: "remove" },
        ],
        certifications: [
          {
            certificationId: "cert-1",
            action: "update",
            name: "AWS",
            issuedBy: "Amazon",
            issuedDate: "2025-01-01",
            evidenceAction: "keep",
            currentAttachmentId: "att-cert",
          },
          {
            action: "create",
            name: "Azure",
            issuedBy: "Microsoft",
            issuedDate: "2025-02-01",
            evidenceAction: "remove",
          },
        ],
      },
    });

    expect(documentRepo.replaceEmployeeDocuments).toHaveBeenCalledWith(
      "emp-1",
      [{ documentType: "resume", fileId: "att-resume" }],
      tx,
    );
    expect(certRepo.replaceEmployeeCertifications).toHaveBeenCalledWith(
      "emp-1",
      [
        {
          id: "cert-1",
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2025-01-01",
          expiredDate: undefined,
          fileId: "att-cert",
        },
        {
          id: undefined,
          name: "Azure",
          issuedBy: "Microsoft",
          issuedDate: "2025-02-01",
          expiredDate: undefined,
          fileId: undefined,
        },
      ],
      tx,
    );
  });
});
