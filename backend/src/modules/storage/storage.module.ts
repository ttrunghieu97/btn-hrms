import { Module } from "@nestjs/common";
import { StorageModule as InfraStorageModule } from "../../infrastructure/storage/storage.module";
import { RequestContextModule } from "../../shared/context/request-context.module";
import { MetricsModule } from "../../shared/metrics/metrics.module";
import { FilesController } from "./files.controller";
import { UploadsController } from "./uploads.controller";
import { ServeFileUseCase } from "./use-cases/serve-file.usecase";
import { FinalizeAttachmentBindingUseCase } from "./use-cases/finalize-attachment-binding.usecase";
import { UploadTempFileUseCase } from "./use-cases/upload-temp-file.usecase";
import { PresignedUploadUseCase } from "./use-cases/presigned-upload.usecase";
import { ConfirmPresignedUploadUseCase } from "./use-cases/confirm-presigned-upload.usecase";
import { MultipartInitUseCase } from "./use-cases/multipart-init.usecase";
import { MultipartCompleteUseCase } from "./use-cases/multipart-complete.usecase";

@Module({
  imports: [InfraStorageModule, RequestContextModule, MetricsModule],
  controllers: [FilesController, UploadsController],
  providers: [
    ServeFileUseCase,
    FinalizeAttachmentBindingUseCase,
    UploadTempFileUseCase,
    PresignedUploadUseCase,
    ConfirmPresignedUploadUseCase,
    MultipartInitUseCase,
    MultipartCompleteUseCase,
  ],
  exports: [InfraStorageModule, FinalizeAttachmentBindingUseCase],
})
export class StorageDomainModule {}
