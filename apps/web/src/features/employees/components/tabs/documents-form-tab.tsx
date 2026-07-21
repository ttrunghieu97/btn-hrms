'use client';

import * as React from 'react';
import { employeeUiCopy } from '@/lib/app-copy';
import { EmployeeDocumentsSection } from '../form/employee-documents-section';
import { EmployeeCertificationsSection } from '../form/employee-certifications-section';
import { Section } from '../form/employee-form-fields';

interface DocumentsFormTabProps {
  documents: Array<{
    id: string;
    label: string;
    checked: boolean;
    url: string;
    fileName?: string;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuedBy: string;
    issuedDate: string;
    expiredDate: string;
    fileUrl: string;
    fileName?: string;
  }>;
  uploadingDocumentIds: ReadonlySet<string>;
  uploadingCertificationIds: ReadonlySet<string>;
  isSubmitting: boolean;
  isPending: boolean;
  onDocumentCheckedChange: (documentId: string, checked: boolean) => void;
  onDocumentFileChange: (documentId: string, file: File) => void;
  onAddCertification: () => void;
  onRemoveCertification: (certificationId: string) => void;
  onCertificationChange: (certificationId: string, field: string, value: string) => void;
  onCertificationFileChange: (certificationId: string, file: File) => void;
  getAssetUrl: (value: string) => string;
}

export function DocumentsFormTab({
  documents,
  certifications,
  uploadingDocumentIds,
  uploadingCertificationIds,
  isSubmitting,
  isPending,
  onDocumentCheckedChange,
  onDocumentFileChange,
  onAddCertification,
  onRemoveCertification,
  onCertificationChange,
  onCertificationFileChange,
  getAssetUrl,
}: DocumentsFormTabProps) {
  return (
    <div className='space-y-6'>
      <Section
        id='employee-documents'
        title={employeeUiCopy.documentsSection.title}
        description={employeeUiCopy.documentsSection.description}
      >
        <EmployeeDocumentsSection
          documents={documents.map((doc) => ({
            ...doc,
            uploading: uploadingDocumentIds.has(doc.id),
            fileName: doc.fileName ?? '',
            url: doc.url ? getAssetUrl(doc.url) : '',
          }))}
          isEditing
          isSavePending={isSubmitting || isPending}
          onDocumentCheckedChange={onDocumentCheckedChange}
          onFileChange={onDocumentFileChange}
        />
      </Section>

      <Section
        id='employee-certifications'
        title={employeeUiCopy.certificationsSection.title}
        description={employeeUiCopy.certificationsSection.description}
      >
        <EmployeeCertificationsSection
          certifications={certifications.map((cert) => ({
            id: cert.id,
            name: cert.name,
            issuedBy: cert.issuedBy,
            issuedDate: cert.issuedDate,
            expiredDate: cert.expiredDate,
            image: cert.fileUrl ? getAssetUrl(cert.fileUrl) : '',
            fileName: cert.fileName ?? '',
            uploading: uploadingCertificationIds.has(cert.id),
          }))}
          isEditing
          isSavePending={isSubmitting || isPending}
          onAdd={onAddCertification}
          onRemove={onRemoveCertification}
          onFieldChange={onCertificationChange}
          onFileChange={onCertificationFileChange}
        />
      </Section>
    </div>
  );
}
