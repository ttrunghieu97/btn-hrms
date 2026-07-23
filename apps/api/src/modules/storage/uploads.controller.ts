import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Idempotent } from "../../infrastructure/idempotency/idempotency.decorator";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { CheckPolicy } from "../../core/security/decorators/check-policy.decorator";
import { FilePolicies } from "../../core/security/policies/file.policy";
import type { AuthUser } from "../../core/security/types/auth-user.interface";
import {
  createMemoryFileInterceptor,
  uploadPolicy,
  uploadPolicyByPurpose,
} from "../../shared/upload/upload-policy";
import {
  UploadTempFileBodyDto,
  UploadTempFileResponseDto,
} from "./dto/upload-temp-file.dto";
import {
  PresignedUploadBodyDto,
  PresignedUploadResponseDto,
  ConfirmPresignedUploadBodyDto,
  ConfirmPresignedUploadResponseDto,
} from "./dto/presigned-upload.dto";
import {
  MultipartInitBodyDto,
  MultipartInitResponseDto,
  MultipartCompleteBodyDto,
  MultipartCompleteResponseDto,
} from "./dto/multipart-upload.dto";
import { UploadTempFileUseCase } from "./use-cases/upload-temp-file.usecase";
import { PresignedUploadUseCase } from "./use-cases/presigned-upload.usecase";
import { ConfirmPresignedUploadUseCase } from "./use-cases/confirm-presigned-upload.usecase";
import { MultipartInitUseCase } from "./use-cases/multipart-init.usecase";
import { MultipartCompleteUseCase } from "./use-cases/multipart-complete.usecase";

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(
    private readonly uploadTempFile: UploadTempFileUseCase,
    private readonly presignedUpload: PresignedUploadUseCase,
    private readonly confirmPresignedUpload: ConfirmPresignedUploadUseCase,
    private readonly multipartInit: MultipartInitUseCase,
    private readonly multipartComplete: MultipartCompleteUseCase,
  ) {}

  @Post("temp")
  @Idempotent("POST:/uploads/temp")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(FilePolicies.upload)
  @ApiOperation({ summary: "Upload temp file for later finalize" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        purpose: { type: "string", enum: ["avatar", "document", "certification"] },
        draftId: { type: "string" },
      },
      required: ["file", "purpose", "draftId"],
    },
  })
  @ApiOkResponse({ type: UploadTempFileResponseDto })
  @UseInterceptors(
    createMemoryFileInterceptor("file", [
      ...uploadPolicyByPurpose.avatar.mimeTypes,
      ...uploadPolicy.mimeTypes.document,
    ]),
  )
  async uploadTemp(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadTempFileBodyDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.uploadTempFile.execute({
      file,
      purpose: body.purpose,
      draftId: body.draftId,
      uploadedBy: req.user!.id,
    });
  }

  @Post("presign")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @CheckPolicy(FilePolicies.upload)
  @ApiOperation({ summary: "Generate presigned upload URL for direct-to-S3 upload" })
  @ApiOkResponse({ type: PresignedUploadResponseDto })
  async presign(
    @Body() body: PresignedUploadBodyDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.presignedUpload.execute({
      purpose: body.purpose,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      mimeType: body.mimeType,
      size: body.size,
      uploadedBy: req.user!.id,
    });
  }

  @Post("presign/confirm")
  @Idempotent("POST:/uploads/presign/confirm")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @CheckPolicy(FilePolicies.upload)
  @ApiOperation({ summary: "Confirm a presigned upload completed successfully" })
  @ApiOkResponse({ type: ConfirmPresignedUploadResponseDto })
  async confirmPresign(
    @Body() body: ConfirmPresignedUploadBodyDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.confirmPresignedUpload.execute({
      fileId: body.fileId,
      uploadedBy: req.user!.id,
    });
  }

  @Post("multipart/init")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(FilePolicies.upload)
  @ApiOperation({ summary: "Initiate multipart upload for files > 50MB" })
  @ApiOkResponse({ type: MultipartInitResponseDto })
  async initMultipart(
    @Body() body: MultipartInitBodyDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.multipartInit.execute({
      purpose: body.purpose,
      ownerType: body.ownerType,
      ownerId: body.ownerId,
      mimeType: body.mimeType,
      fileName: body.fileName,
      size: body.size,
      uploadedBy: req.user!.id,
    });
  }

  @Post("multipart/complete")
  @Idempotent("POST:/uploads/multipart/complete")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @CheckPolicy(FilePolicies.upload)
  @ApiOperation({ summary: "Complete a multipart upload after all parts uploaded" })
  @ApiOkResponse({ type: MultipartCompleteResponseDto })
  async completeMultipart(
    @Body() body: MultipartCompleteBodyDto,
  ) {
    return this.multipartComplete.execute({
      fileId: body.fileId,
      uploadId: body.uploadId,
      parts: body.parts,
    });
  }
}
