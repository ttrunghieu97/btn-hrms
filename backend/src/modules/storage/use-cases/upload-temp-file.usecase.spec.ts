import { UploadTempFileUseCase } from "./upload-temp-file.usecase";
import { type StorageService } from "../../../infrastructure/storage/storage.service";

jest.mock("file-type", () => ({
  fileTypeFromBuffer: jest.fn(async (buffer: Buffer) =>
    buffer[0] === 0x25
      ? { ext: "pdf", mime: "application/pdf" }
      : { ext: "png", mime: "image/png" },
  ),
}), { virtual: true });

describe(UploadTempFileUseCase.name, () => {
  const storage = {
    uploadTemp: jest.fn(),
  };

  let useCase: UploadTempFileUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UploadTempFileUseCase(storage as unknown as StorageService, {} as any);
  });

  it("returns canonical temp upload metadata", async () => {
    const file = {
      buffer: Buffer.alloc(1024),
      mimetype: "image/png",
      originalname: "avatar.png",
      size: 1024,
    } as Express.Multer.File;

    storage.uploadTemp.mockResolvedValue({
      fileId: "temp-file-1",
      tempFileToken: "temp-token-1",
      key: "temp/temp-file-1.png",
      url: "/files/temp/temp-file-1.png",
      expiresAt: new Date("2026-05-08T00:00:00.000Z"),
      deduplicated: false,
      originalName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    });

    const result = await useCase.execute({
      file,
      purpose: "avatar",
      draftId: "draft-employee-1",
      uploadedBy: "user-1",
    });

    expect(result).toEqual(
      expect.objectContaining({
        tempFileToken: "temp-token-1",
        tempFileId: "temp-file-1",
        url: expect.stringContaining("/files/temp/"),
        fileName: "avatar.png",
        mimeType: "image/png",
        sizeBytes: 1024,
      }),
    );

    expect(storage.uploadTemp).toHaveBeenCalledWith({
      buffer: file.buffer,
      mimeType: "image/png",
      originalName: "avatar.png",
      ownerType: "employee",
      ownerId: "draft-employee-1",
      purpose: "avatar",
      uploadedBy: "user-1",
    });
  });

  it("delegates avatar purpose and owner data to temp storage", async () => {
    const file = {
      buffer: Buffer.alloc(256),
      mimetype: "image/png",
      originalname: "avatar.png",
      size: 256,
    } as Express.Multer.File;

    storage.uploadTemp.mockResolvedValue({
      fileId: "temp-avatar-png",
      tempFileToken: "token-avatar-png",
      key: "temp/temp-avatar-png.png",
      url: "/files/temp/temp-avatar-png.png",
      expiresAt: new Date("2026-05-11T00:00:00.000Z"),
      deduplicated: false,
      originalName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: 256,
    });

    await useCase.execute({
      file,
      purpose: "avatar",
      draftId: "draft-avatar-1",
      uploadedBy: "user-avatar-1",
    });

    expect(storage.uploadTemp).toHaveBeenCalledWith({
      buffer: file.buffer,
      mimeType: "image/png",
      originalName: "avatar.png",
      ownerType: "employee",
      ownerId: "draft-avatar-1",
      purpose: "avatar",
      uploadedBy: "user-avatar-1",
    });
  });

  it("rejects PDF uploaded with avatar purpose", async () => {
    const file = {
      buffer: Buffer.from("%PDF-1.7"),
      mimetype: "application/pdf",
      originalname: "avatar.pdf",
      size: 256,
    } as Express.Multer.File;

    await expect(
      useCase.execute({
        file,
        purpose: "avatar",
        draftId: "draft-avatar-1",
        uploadedBy: "user-avatar-1",
      }),
    ).rejects.toMatchObject({
      message: 'File type "application/pdf" is not allowed for purpose "avatar"',
    });

    expect(storage.uploadTemp).not.toHaveBeenCalled();
  });
});
