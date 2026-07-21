import { ConfirmPresignedUploadUseCase } from "./confirm-presigned-upload.usecase";
import { type StorageService } from "../../../infrastructure/storage/storage.service";
import { type ScanQueueService } from "../../../infrastructure/storage/scan-queue.service";
import { type ImageProcessingService } from "../../../infrastructure/storage/image-processing.service";

describe(ConfirmPresignedUploadUseCase.name, () => {
  const storage = {
    getFileById: jest.fn(),
    objectExists: jest.fn(),
    getObjectMeta: jest.fn(),
    confirmPendingUpload: jest.fn(),
    getUrl: jest.fn((key: string) => `/files/${key}`),
  };
  const scanQueue = {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };
  const imageProcessing = {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };

  let useCase: ConfirmPresignedUploadUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ConfirmPresignedUploadUseCase(
      storage as unknown as StorageService,
      scanQueue as unknown as ScanQueueService,
      imageProcessing as unknown as ImageProcessingService,
      {} as any,
    );
  });

  it("rejects confirm when pending upload belongs to another user", async () => {
    storage.getFileById.mockResolvedValue({
      id: "file-1",
      key: "uploads/employees/employee-1/file-1.png",
      status: "pending_upload",
      mimeType: "image/png",
      purpose: "avatar",
      ownerType: "employee",
      ownerId: "employee-1",
      uploadedBy: "user-owner",
    });

    await expect(
      useCase.execute({
        fileId: "file-1",
        uploadedBy: "user-other",
      }),
    ).rejects.toMatchObject({
      response: {
        error: "FILE_NOT_FOUND",
      },
    });

    expect(storage.objectExists).not.toHaveBeenCalled();
    expect(storage.confirmPendingUpload).not.toHaveBeenCalled();
  });

  it("rejects confirm when uploaded object size differs from DB record", async () => {
    storage.getFileById.mockResolvedValue({
      id: "file-1",
      key: "uploads/employees/employee-1/file-1.png",
      status: "pending_upload",
      mimeType: "image/png",
      purpose: "avatar",
      ownerType: "employee",
      ownerId: "employee-1",
      uploadedBy: "user-owner",
      sizeBytes: 1024,
    });
    storage.objectExists.mockResolvedValue(true);
    storage.getObjectMeta.mockResolvedValue({
      size: 2048,
      contentType: "image/png",
    });

    await expect(
      useCase.execute({
        fileId: "file-1",
        uploadedBy: "user-owner",
      }),
    ).rejects.toMatchObject({
      response: {
        error: "FILE_SIZE_MISMATCH",
      },
    });

    expect(storage.confirmPendingUpload).not.toHaveBeenCalled();
  });
});
