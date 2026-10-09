import { PresignedUploadUseCase } from "./presigned-upload.usecase";
import { type StorageService } from "../../../infrastructure/storage/storage.service";

describe(PresignedUploadUseCase.name, () => {
  const storage = {
    isS3: jest.fn().mockReturnValue(true),
    getPresignedPutUrl: jest.fn(),
    insertPendingUploadRecord: jest.fn(),
  };
  const config = {
    get: jest.fn().mockReturnValue("btn-hrms"),
  };

  let useCase: PresignedUploadUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.isS3.mockReturnValue(true);
    useCase = new PresignedUploadUseCase(
      storage as unknown as StorageService,
      config as any,
      {} as any,
    );
  });

  it("rejects PDF for avatar presigned upload", async () => {
    await expect(
      useCase.execute({
        purpose: "avatar",
        ownerType: "employee",
        ownerId: "employee-1",
        mimeType: "application/pdf",
        size: 1024,
        uploadedBy: "user-1",
      }),
    ).rejects.toMatchObject({
      response: {
        error: "UNSUPPORTED_MEDIA_TYPE",
      },
    });

    expect(storage.getPresignedPutUrl).not.toHaveBeenCalled();
    expect(storage.insertPendingUploadRecord).not.toHaveBeenCalled();
  });

  it("rejects presigned upload for another employee when actor lacks management permissions", async () => {
    const mockContext = {
      get: jest.fn().mockReturnValue({
        userId: "user-1",
        employeeId: "employee-1",
        permissions: ["file:upload"],
        isSuperAdmin: false,
      }),
    };
    const secureUseCase = new PresignedUploadUseCase(
      storage as unknown as StorageService,
      config as any,
      mockContext as any,
    );

    await expect(
      secureUseCase.execute({
        purpose: "document",
        ownerType: "employee",
        ownerId: "employee-2",
        mimeType: "application/pdf",
        size: 1024,
        uploadedBy: "user-1",
      }),
    ).rejects.toThrow("Cannot upload files for another employee without management permissions");
  });

  it("allows presigned upload for another employee when actor has employees:manage:sensitive", async () => {
    storage.getPresignedPutUrl.mockResolvedValue("https://s3.example.com/put");
    const mockContext = {
      get: jest.fn().mockReturnValue({
        userId: "user-admin",
        employeeId: "employee-admin",
        permissions: ["employees:manage:sensitive"],
        isSuperAdmin: false,
      }),
    };
    const secureUseCase = new PresignedUploadUseCase(
      storage as unknown as StorageService,
      config as any,
      mockContext as any,
    );

    const result = await secureUseCase.execute({
      purpose: "document",
      ownerType: "employee",
      ownerId: "employee-2",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: "user-admin",
    });

    expect(result.uploadUrl).toBe("https://s3.example.com/put");
    expect(storage.getPresignedPutUrl).toHaveBeenCalled();
  });
});
