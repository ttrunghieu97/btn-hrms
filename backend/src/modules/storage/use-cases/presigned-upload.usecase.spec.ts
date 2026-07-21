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
});
