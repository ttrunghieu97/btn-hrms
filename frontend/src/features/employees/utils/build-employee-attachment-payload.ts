import type { EmployeeAttachmentIntentPayload } from '../types/employee-attachment-payload';
import type { EmployeeDocumentFormField, EmployeeCertificationFormField } from './employee-form-model';

/**
 * Build the simplified attachment intent payload from form state.
 *
 * New files are staged and represented by replace intents.
 */
export function buildEmployeeAttachmentPayload(
  formValues: {
    avatarFile?: File;
    avatarTempFileToken?: string;
    avatarRemoved?: boolean;
    avatarAttachmentId?: string;
    documents: EmployeeDocumentFormField[];
    certifications: EmployeeCertificationFormField[];
  },
): EmployeeAttachmentIntentPayload {
  let avatar: EmployeeAttachmentIntentPayload['avatar'];
  if (formValues.avatarRemoved) {
    avatar = {
      mode: 'remove',
      ...(formValues.avatarAttachmentId
        ? { attachmentId: formValues.avatarAttachmentId }
        : {}),
    };
  } else if (formValues.avatarTempFileToken) {
    avatar = { mode: 'replace', tempFileToken: formValues.avatarTempFileToken };
  } else if (formValues.avatarAttachmentId && !formValues.avatarFile) {
    avatar = { mode: 'keep', attachmentId: formValues.avatarAttachmentId };
  } else if (!formValues.avatarAttachmentId && !formValues.avatarFile) {
    avatar = undefined;
  }

  const documents = formValues.documents
    .filter((d) => d.attachmentId || d.tempFileToken)
    .map((doc) => {
      if (doc.checked && doc.tempFileToken) {
        return {
          documentType: doc.documentType,
          mode: 'replace' as const,
          tempFileToken: doc.tempFileToken,
        };
      }
      if (!doc.checked) {
        return { documentType: doc.documentType, mode: 'remove' as const, attachmentId: doc.attachmentId! };
      }
      return { documentType: doc.documentType, mode: 'keep' as const, attachmentId: doc.attachmentId! };
    });

  // Certifications — keep existing evidence, remove if no longer applicable
  const certifications = formValues.certifications
    .filter((c) => c.name.trim() && c.issuedBy.trim() && c.issuedDate)
    .map((cert) => {
      let evidence:
        | { mode: 'keep' | 'remove' | 'replace'; attachmentId?: string; tempFileToken?: string }
        | undefined;
      if (cert.evidenceTempFileToken) {
        evidence = { mode: 'replace', tempFileToken: cert.evidenceTempFileToken };
      } else if (cert.evidenceAttachmentId && !cert.evidenceFile) {
        evidence = { mode: 'keep', attachmentId: cert.evidenceAttachmentId };
      }
      return {
        ...(cert.id.startsWith('cert-') ? {} : { id: cert.id }),
        name: cert.name,
        issuedBy: cert.issuedBy,
        ...(cert.issuedDate ? { issuedDate: cert.issuedDate } : {}),
        ...(cert.expiredDate ? { expiredDate: cert.expiredDate } : {}),
        ...(evidence ? { evidence } : {}),
      };
    });

  return {
    avatar,
    ...(documents.length ? { documents } : {}),
    ...(certifications.length ? { certifications } : {}),
  };
}
