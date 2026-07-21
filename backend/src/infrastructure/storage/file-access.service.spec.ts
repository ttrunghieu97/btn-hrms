import { FileAccessService } from "./file-access.service";
import type { FileEntity } from "./storage.types";

describe(FileAccessService.name, () => {
  const service = new FileAccessService({} as never);
  const file: FileEntity = {
    id: "file-1",
    key: "employees/employee-1/avatar.jpg",
    bucket: "private",
    ownerType: "employee",
    ownerId: "employee-1",
    purpose: "avatar",
    status: "active",
    mimeType: "image/jpeg",
    sizeBytes: 128,
    sha256: null,
    uploadedBy: "user-uploader",
    finalizedAt: new Date(),
    expiresAt: null,
    scanStatus: null,
    scanResult: null,
    scannedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("allows super admins to access any file", () => {
    expect(service.canAccess(file, { id: "u1", isSuperAdmin: true })).toBe(true);
  });

  it("allows employees:view users to access employee-owned files", () => {
    expect(
      service.canAccess(file, {
        id: "u1",
        permissions: ["employees:view"],
      }),
    ).toBe(true);
  });

  it("allows authenticated users to access active employee avatars", () => {
    expect(
      service.canAccess(
        {
          ownerType: "employee",
          ownerId: "emp-2",
          uploadedBy: "user-2",
          purpose: "avatar",
          status: "active",
        } as any,
        {
          id: "user-1",
          employeeId: "emp-1",
          permissions: [],
        },
      ),
    ).toBe(true);
  });

  it("does not expose temp avatars to unrelated users", () => {
    expect(
      service.canAccess(
        {
          ownerType: "employee",
          ownerId: "draft-1",
          uploadedBy: "user-2",
          purpose: "avatar",
          status: "temp",
        } as any,
        {
          id: "user-1",
          employeeId: "emp-1",
          permissions: [],
        },
      ),
    ).toBe(false);
  });

  it("allows an employee to access their own file", () => {
    expect(
      service.canAccess(file, {
        id: "u1",
        employeeId: "employee-1",
      }),
    ).toBe(true);
  });

  it("allows the uploader to access their own uploaded file", () => {
    expect(service.canAccess(file, { id: "user-uploader" })).toBe(true);
  });

  it("denies unrelated users without elevated permissions", () => {
    expect(
      service.canAccess(
        {
          ...file,
          key: "employees/employee-1/document.pdf",
          purpose: "document",
          mimeType: "application/pdf",
        },
        {
          id: "u2",
          employeeId: "employee-2",
          permissions: ["departments:view"],
        },
      ),
    ).toBe(false);
  });
});
