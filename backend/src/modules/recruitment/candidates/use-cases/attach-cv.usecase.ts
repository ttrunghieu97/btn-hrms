import { Injectable } from "@nestjs/common";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import type {
  FileOwnerType,
  FilePurpose,
} from "../../../../infrastructure/storage/storage.types";
import { ApplicationsRepository } from "../repositories/applications.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

/**
 * CV files are owned by the application aggregate. The `application` owner type
 * and `cv` purpose are first-class members of the storage layer's FileOwnerType
 * / FilePurpose unions.
 */
const CV_OWNER_TYPE: FileOwnerType = "application";
const CV_PURPOSE: FilePurpose = "cv";

@Injectable()
export class AttachCvUseCase {
  constructor(
    private readonly storage: StorageService,
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Attach a previously uploaded temp CV to an application.
   * Ordering guarantee: the owning DB write must have committed BEFORE this
   * runs, then finalizeUpload promotes the temp file, then we persist fileId.
   */
  async execute(applicationId: string, fileToken: string) {
    const uploadedBy = this.requestContext.get()?.userId ?? undefined;

    const result = await this.storage.finalizeUpload({
      fileToken,
      ownerType: CV_OWNER_TYPE,
      ownerId: applicationId,
      purpose: CV_PURPOSE,
      ...(uploadedBy ? { uploadedBy } : {}),
    });

    await this.applicationsRepo.updateApplicationCvFile(
      applicationId,
      result.fileId,
    );

    return { applicationId, fileId: result.fileId };
  }
}
