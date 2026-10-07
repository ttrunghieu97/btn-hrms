import { ServeFileUseCase } from "./serve-file.usecase";
import { type StorageService } from "../../../infrastructure/storage/storage.service";
import { type FileAccessService } from "../../../infrastructure/storage/file-access.service";

describe(ServeFileUseCase.name, () => {
  const storage = {
    getObjectMeta: jest.fn(),
    isPublicPurpose: jest.fn(),
    isSignedUrlEnabled: jest.fn(),
    getObjectStream: jest.fn(),
  };
  const fileAccess = {
    resolve: jest.fn(),
    canAccess: jest.fn(),
  };

  let useCase: ServeFileUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ServeFileUseCase(
      storage as unknown as StorageService,
      fileAccess as unknown as FileAccessService,
      { get: jest.fn(() => ({ requestId: "test" })) } as any,
    );
  });

  it("blocks non-super-admin access while a file is pending virus scan", async () => {
    fileAccess.resolve.mockResolvedValue({
      id: "file-1",
      key: "employees/emp-1/doc.pdf",
      ownerType: "employee",
      ownerId: "emp-1",
      purpose: "document",
      status: "active",
      scanStatus: "pending",
    });

    await expect(
      useCase.execute("employees/emp-1/doc.pdf", {
        id: "user-1",
        permissions: ["employees:view"],
      } as any),
    ).rejects.toMatchObject({
      response: {
        error: "PERMISSION_DENIED",
      },
    });

    expect(fileAccess.canAccess).not.toHaveBeenCalled();
    expect(storage.getObjectStream).not.toHaveBeenCalled();
  });
});
