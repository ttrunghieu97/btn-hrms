'use client';

import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { Checkbox } from '@/components/ui/checkbox';
import { EmployeeAttachmentUploadControl } from './employee-attachment-upload-control';

const DOCUMENT_UPLOAD_HINT = ['PNG', 'JPG', 'WEBP', 'PDF'].join(', ') + ' &bull; Toi da 5MB';

export interface DocumentField {
  id: string;
  label: string;
  checked: boolean;
  url: string;
  fileName: string;
  uploading?: boolean;
}

export interface EmployeeDocumentsSectionProps {
  documents: DocumentField[];
  isEditing: boolean;
  isSavePending: boolean;
  onDocumentCheckedChange: (documentId: string, checked: boolean) => void;
  onFileChange: (documentId: string, file: File) => void;
}

export function EmployeeDocumentsSection({
  documents,
  isEditing,
  isSavePending,
  onDocumentCheckedChange,
  onFileChange
}: EmployeeDocumentsSectionProps) {
  const isUploadDisabled = !isEditing || isSavePending;

  return (
    <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
      {documents.map((document) => {
        return (
          <div
            key={document.id}
            className='rounded-2xl border border-border/60 bg-background/80 p-3'
          >
            <div className='flex items-start gap-3'>
              <Checkbox
                checked={document.checked}
                disabled={isSavePending || !isEditing}
                onCheckedChange={(checked) =>
                  onDocumentCheckedChange(document.id, checked === true)
                }
              />
              <div className='min-w-0 flex-1'>
                <div className='text-sm font-medium leading-5'>{document.label}</div>
                <div className='text-muted-foreground text-xs'>
                  {document.fileName
                    ? employeeUiCopy.documentsSection.evidencePrefix(document.fileName)
                    : document.checked
                      ? employeeUiCopy.documentsSection.selectedNoEvidence
                      : employeeUiCopy.documentsSection.unselected}
                </div>
              </div>
              <EmployeeAttachmentUploadControl
                fileName={document.fileName}
                viewUrl={document.url}
                uploading={document.uploading}
                disabled={isUploadDisabled}
                showUpload={isEditing}
                onFileChange={(file) => onFileChange(document.id, file)}
              />
            </div>
          </div>
        );
      })}
      {isEditing && (
        <p className='text-muted-foreground col-span-full text-xs'>
          {DOCUMENT_UPLOAD_HINT}
        </p>
      )}
    </div>
  );
}
