import type { ConfigService } from "@nestjs/config";
import { StorageConfigService } from "./storage-config.service";
import { S3ClientService } from "./s3-client.service";
import { StorageUrlService } from "./storage-url.service";
import { StorageObjectService } from "./storage-object.service";
import { RequestContextService } from "../../shared/context/request-context.service";
import type { MetricsService } from "../../shared/metrics/metrics.service";
import type { FileAuditLogService } from "./file-audit-log.service";
import type { FileRepository } from "./file.repository";
import { StorageService } from "./storage.service";
import type { VirusScannerService } from "./virus-scanner.service";

describe("StorageService", () => {
  const makeService = () => {
    const config = {
      get: jest.fn((key: string) => (key === "STORAGE_BACKEND" ? "local" : undefined)),
    } as unknown as ConfigService;
    const storageConfig = new StorageConfigService(config);
    const s3Client = new S3ClientService(storageConfig);
    const storageUrl = new StorageUrlService(storageConfig);
    const storageObject = new StorageObjectService(s3Client, storageConfig);
    const fileRepo = {
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<FileRepository>;
    const auditLog = {
      confirm: jest.fn(),
    } as unknown as jest.Mocked<FileAuditLogService>;
    const virusScanner = {} as VirusScannerService;
    const metrics = {
      incrementUploadSuccess: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    return {
      service: new StorageService(
        s3Client,
        storageUrl,
        storageObject,
        new RequestContextService(),
        fileRepo,
        auditLog,
        virusScanner,
        metrics,
      ),
      fileRepo,
    };
  };

  it("persists pending uploads with storage-owned enum values", async () => {
    const { service, fileRepo } = makeService();

    await service.insertPendingUploadRecord({
      id: "file-1",
      key: "uploads/employees/employee-1/file-1.pdf",
      bucket: "files",
      ownerType: "employee",
      ownerId: "employee-1",
      purpose: "document",
      mimeType: "application/pdf",
      sizeBytes: 100,
      uploadedBy: "user-1",
    });

    expect(fileRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: "employee",
        purpose: "document",
        status: "pending_upload",
      }),
    );
  });

  it("treats a missing local object as an idempotent delete", async () => {
    const { service } = makeService();

    await expect(
      service.deleteObject("missing/storage-service-test-file"),
    ).resolves.toBeUndefined();
  });
});
