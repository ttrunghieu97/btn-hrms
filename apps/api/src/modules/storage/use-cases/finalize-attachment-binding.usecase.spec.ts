import { UnprocessableEntityException } from "@nestjs/common";
import { FinalizeAttachmentBindingUseCase } from "./finalize-attachment-binding.usecase";
import { type StorageService } from "../../../infrastructure/storage/storage.service";
import { type ScanQueueService } from "../../../infrastructure/storage/scan-queue.service";
import { type ImageProcessingService } from "../../../infrastructure/storage/image-processing.service";

describe(FinalizeAttachmentBindingUseCase.name, () => {
  const storage = {
    finalizeUpload: jest.fn(),
  };
  const scanQueue = {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };
  const imageProcessing = {
    enqueue: jest.fn().mockResolvedValue(undefined),
  };

  let useCase: FinalizeAttachmentBindingUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new FinalizeAttachmentBindingUseCase(
      storage as unknown as StorageService,
      scanQueue as unknown as ScanQueueService,
      {} as any,
      imageProcessing as unknown as ImageProcessingService,
    );
  });

  it("finalizes by fileToken and returns canonical attachment result", async () => {
    storage.finalizeUpload.mockResolvedValue({
      fileId: "file-1",
      key: "employees/employee-1/file-1.pdf",
      url: "http://localhost/files/employees/employee-1/file-1.pdf",
    });

    await expect(
      useCase.execute({
        fileToken: "file-1",
        ownerType: "employee",
        ownerId: "employee-1",
        purpose: "document",
      }),
    ).resolves.toEqual({
      attachmentId: "file-1",
      fileId: "file-1",
      key: "employees/employee-1/file-1.pdf",
      url: "http://localhost/files/employees/employee-1/file-1.pdf",
      ownerType: "employee",
      ownerId: "employee-1",
      purpose: "document",
    });

    expect(storage.finalizeUpload).toHaveBeenCalledWith({
      fileToken: "file-1",
      ownerType: "employee",
      ownerId: "employee-1",
      purpose: "document",
    });
  });

  it("rejects when temp file token is missing", async () => {
    await expect(
      useCase.execute({
        ownerType: "employee",
        ownerId: "employee-1",
        purpose: "document",
      } as any),
    ).rejects.toMatchObject({
      response: {
        message: "Temp file token is required",
        error: "TEMP_FILE_TOKEN_REQUIRED",
      },
    });

    expect(storage.finalizeUpload).not.toHaveBeenCalled();
  });

  it("preserves finalize failures", async () => {
    const error = new UnprocessableEntityException("expired");
    storage.finalizeUpload.mockRejectedValue(error);

    await expect(
      useCase.execute({
        fileToken: "file-3",
        ownerType: "employee",
        ownerId: "employee-1",
        purpose: "certification",
      }),
    ).rejects.toBe(error);
  });
});
