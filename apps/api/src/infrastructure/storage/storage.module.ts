import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RequestContextModule } from "../../shared/context/request-context.module";
import { MetricsModule } from "../../shared/metrics/metrics.module";
import { StorageService } from "./storage.service";
import { S3ClientService } from "./s3-client.service";
import { StorageConfigService } from "./storage-config.service";
import { StorageUrlService } from "./storage-url.service";
import { StorageObjectService } from "./storage-object.service";
import { FileRepository } from "./file.repository";
import { PendingFinalizeService } from "./pending-finalize.service";
import { FileAccessService } from "./file-access.service";
import { VirusScannerService } from "./virus-scanner.service";
import { ScanQueueService } from "./scan-queue.service";
import { ImageProcessingService } from "./image-processing.service";
import { FileAuditLogService } from "./file-audit-log.service";

@Module({
  imports: [
    ConfigModule,
    RequestContextModule,
    MetricsModule,
  ],
  providers: [
    StorageConfigService,
    S3ClientService,
    StorageUrlService,
    StorageObjectService,
    StorageService,
    FileRepository,
    FileAccessService,
    PendingFinalizeService,
    VirusScannerService,
    ScanQueueService,
    ImageProcessingService,
    FileAuditLogService,
  ],
  exports: [
    StorageConfigService,
    S3ClientService,
    StorageUrlService,
    StorageObjectService,
    StorageService,
    FileRepository,
    FileAccessService,
    PendingFinalizeService,
    VirusScannerService,
    ScanQueueService,
    ImageProcessingService,
    FileAuditLogService,
  ],
})
export class StorageModule {}






