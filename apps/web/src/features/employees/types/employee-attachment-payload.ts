/**
 * Simplified file state for employee form attachments.
 *
 * Replaces the 6-state UploadFieldState with two cases:
 * - New file picked by user (file selected but not yet uploaded)
 * - Existing attachment from API (edit mode)
 *
 * New files are staged first and finalized by the employee command.
 */

export interface EmployeeNewFile {
  file: File;
}

export interface EmployeeExistingAttachment {
  attachmentId: string;
  existingUrl?: string;
  fileName?: string;
}

export type EmployeeFileField = EmployeeNewFile | EmployeeExistingAttachment | null;

export interface EmployeeDocumentField {
  id: string;
  documentType: string;
  label: string;
  checked: boolean;
  /** New file picked by user (uploaded during submit) */
  file?: File;
  /** Existing attachment ID (edit mode) */
  attachmentId?: string;
  /** Existing attachment URL for preview */
  existingUrl?: string;
  /** Filename for display */
  fileName?: string;
}

export interface EmployeeCertificationField {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate: string;
  /** New evidence file (uploaded during submit) */
  evidenceFile?: File;
  /** Existing evidence attachment ID */
  evidenceAttachmentId?: string;
  /** Existing evidence URL for preview */
  evidenceUrl?: string;
  /** Filename for display */
  evidenceFileName?: string;
}

/**
 * API contract types — sent as JSON after files are uploaded directly.
 * Only 'keep' and 'remove' actions; 'replace' is handled by the upload endpoint itself.
 */
export interface EmployeeAttachmentIntentPayload {
  avatar?: {
    mode: 'keep' | 'remove' | 'replace';
    attachmentId?: string;
    tempFileToken?: string;
  };
  documents?: Array<{
    documentType: string;
    mode: 'keep' | 'remove' | 'replace';
    attachmentId?: string;
    tempFileToken?: string;
  }>;
  certifications?: Array<{
    id?: string;
    name: string;
    issuedBy: string;
    issuedDate?: string;
    expiredDate?: string;
    evidence?: {
      mode: 'keep' | 'remove' | 'replace';
      attachmentId?: string;
      tempFileToken?: string;
    };
  }>;
}
