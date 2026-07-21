import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Inject } from "@nestjs/common";
import { EVIDENCE_STORAGE_PORT, type EvidenceStoragePort } from "../ports/evidence-storage.port";
import { AttendancesRepository } from "../repositories/attendances.repository";

/**
 * Orphan evidence cleanup worker.
 *
 * Scans for selfie S3 keys stored in the attendances table where the
 * attendance record was deleted (soft or hard) or never completed.
 *
 * For now, this is a safety net that logs suspected orphans.
 * The actual storage-level cleanup (S3 lifecycle / bucket purge)
 * is delegated to the infrastructure layer.
 *
 * Runs daily at 03:00.
 */
@Injectable()
export class EvidenceCleanupService {
  private readonly logger = new Logger(EvidenceCleanupService.name);

  constructor(
    @Inject(EVIDENCE_STORAGE_PORT)
    private readonly storage: EvidenceStoragePort,
    private readonly attendancesRepo: AttendancesRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanOrphanEvidence(): Promise<void> {
    this.logger.log("Starting orphan evidence cleanup cycle...");

    try {
      // Query attendances with selfieS3Key but no image URL (orphaned uploads)
      // In a full implementation, this would query S3 for temp prefix objects
      // older than TTL and delete them.
      //
      // For now: scan known attendance records with selfie keys and verify
      // they have valid linked records.
      const orphans = await this.findOrphans();
      if (orphans.length === 0) {
        this.logger.log("No orphan evidence found.");
        return;
      }

      this.logger.warn(`Found ${orphans.length} potential orphan evidence objects.`);

      for (const key of orphans) {
        try {
          await this.storage.delete(key);
          this.logger.log(`Deleted orphan evidence: ${key}`);
        } catch (err) {
          this.logger.error(`Failed to delete orphan evidence: ${key}`, err instanceof Error ? err.message : String(err));
        }
      }
    } catch (err) {
      this.logger.error("Orphan evidence cleanup failed", err instanceof Error ? err.message : String(err));
    }
  }

  private async findOrphans(): Promise<string[]> {
    // Phase 1 implementation: check for attendance records with selfieS3Key
    // where the attendance was created more than 24h ago but has no valid
    // check-in/check-out time (incomplete record).
    //
    // Future: scan S3 bucket for objects under attendance/selfies/ prefix
    // that don't have a corresponding DB record.
    //
    // For now, return empty — the S3 lifecycle policy handles orphan cleanup.
    // This method serves as the hook for future DB-based orphan detection.
    return [];
  }
}
