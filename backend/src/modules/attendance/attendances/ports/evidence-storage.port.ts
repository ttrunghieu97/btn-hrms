/**
 * EvidenceStoragePort — abstraction for storing attendance evidence (selfies).
 *
 * Implementations may store to local disk, S3, or any other backend.
 */
export const EVIDENCE_STORAGE_PORT = Symbol("EVIDENCE_STORAGE_PORT");

export type EvidenceStorageInput = {
  employeeId: string;
  buffer: Buffer;
  mime: string;
  uploadedBy?: string;
};

export type EvidenceStorageResult = {
  key: string;
  url: string;
};

export interface EvidenceStoragePort {
  store(input: EvidenceStorageInput): Promise<EvidenceStorageResult>;
  delete(key: string): Promise<void>;
}
