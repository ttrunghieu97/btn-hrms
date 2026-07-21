import { Injectable, UnsupportedMediaTypeException } from "@nestjs/common";
import { StorageService } from "../../../infrastructure/storage/storage.service";
import { UploadTempFileResponseDto } from "../dto/upload-temp-file.dto";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { uploadPolicyByPurpose, validateFileMagicBytes } from "../../../shared/upload/upload-policy";

@Injectable()
export class UploadTempFileUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly storage: StorageService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UploadTempFileUseCase.name);
  }

  async execute(input: {
    file: Express.Multer.File;
    purpose: "avatar" | "document" | "certification";
    draftId: string;
    uploadedBy: string;
  }): Promise<UploadTempFileResponseDto> {
    const { purpose } = input;
    const purposeConfig = uploadPolicyByPurpose[purpose];

    // Magic byte validation — never trust browser-reported MIME
    await validateFileMagicBytes(input.file.buffer, input.file.mimetype);

    if (!purposeConfig.mimeTypes.includes(input.file.mimetype as any)) {
      throw new UnsupportedMediaTypeException(
        `File type "${input.file.mimetype}" is not allowed for purpose "${purpose}"`,
      );
    }

    // Purpose-specific size validation (multer enforces max, but double-check)
    if (input.file.size > purposeConfig.maxFileSizeBytes) {
      throw new UnsupportedMediaTypeException(
        `File exceeds maximum size for "${purpose}": ${purposeConfig.maxFileSizeBytes} bytes`,
      );
    }

    const uploaded = await this.storage.uploadTemp({
      buffer: input.file.buffer,
      mimeType: input.file.mimetype,
      originalName: input.file.originalname,
      ownerType: "employee",
      ownerId: input.draftId,
      purpose,
      uploadedBy: input.uploadedBy,
    });

    return {
      tempFileToken: uploaded.tempFileToken,
      tempFileId: uploaded.fileId,
      url: uploaded.url,
      fileName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
    };
  }
}
