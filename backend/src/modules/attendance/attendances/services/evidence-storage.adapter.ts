import { Injectable } from "@nestjs/common";
import type { EvidenceStoragePort, EvidenceStorageInput, EvidenceStorageResult } from "../ports/evidence-storage.port";
import { SelfieStorageService } from "./selfie-storage.service";

/**
 * Adapter: EvidenceStoragePort → SelfieStorageService.
 * Keeps existing selfie storage logic while exposing the port interface.
 */
@Injectable()
export class EvidenceStorageAdapter implements EvidenceStoragePort {
  constructor(private readonly selfieStorage: SelfieStorageService) {}

  async store(input: EvidenceStorageInput): Promise<EvidenceStorageResult> {
    return this.selfieStorage.upload(
      input.employeeId,
      input.buffer,
      input.mime,
      input.uploadedBy,
    );
  }

  async delete(key: string): Promise<void> {
    // Selfie cleanup is handled by a separate cron; no-op for now.
    // Future: add selfieStorage.delete(key) if needed.
  }
}
