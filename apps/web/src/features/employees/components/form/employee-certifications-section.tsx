'use client';

import * as React from 'react';
import { formatDateVN } from "@/lib/date";
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmployeeAttachmentUploadControl } from './employee-attachment-upload-control';

const CERTIFICATION_UPLOAD_HINT = ['PNG', 'JPG', 'WEBP', 'PDF'].join(', ') + ' &bull; Toi da 5MB';

export interface CertificationField {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate: string;
  image: string;
  fileName: string;
  uploading?: boolean;
}

export interface EmployeeCertificationsSectionProps {
  certifications: CertificationField[];
  isEditing: boolean;
  isSavePending: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onFieldChange: (id: string, field: keyof CertificationField, value: string) => void;
  onFileChange: (certificationId: string, file: File) => void;
}

function formatValue(value: unknown, fallback = commonUiCopy.notAvailable) {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
}

function formatDate(value: unknown, fallback = commonUiCopy.notAvailable) {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateVN(date);
}

function EditableItem({
  label,
  value,
  editing,
  disabled,
  type,
  onChange
}: {
  label: string;
  value: string;
  editing: boolean;
  disabled?: boolean;
  type?: React.ComponentProps<typeof Input>['type'];
  onChange: (value: string) => void;
}) {
  return (
    <div className='space-y-1.5 rounded-xl border border-border/50 bg-background/70 p-3'>
      <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>{label}</div>
      {editing ? (
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      ) : (
        <div className='min-h-9 py-2 text-sm font-medium break-words'>
          {type === 'date' ? formatDate(value) : formatValue(value)}
        </div>
      )}
    </div>
  );
}

export function EmployeeCertificationsSection({
  certifications,
  isEditing,
  isSavePending,
  onAdd,
  onRemove,
  onFieldChange,
  onFileChange
}: EmployeeCertificationsSectionProps) {
  const isUploadDisabled = !isEditing || isSavePending;

  return (
    <div className='space-y-3'>
      <div className='min-h-9'>
        <Button
          type='button'
          variant='outline'
          className={cn(!isEditing && 'invisible')}
          onClick={onAdd}
          disabled={!isEditing || isSavePending}
        >
          {employeeUiCopy.certificationsSection.add}
        </Button>
      </div>
      {certifications.length > 0 ? (
        certifications.map((certification) => {
          return (
            <div
              key={certification.id}
              className='rounded-2xl border border-border/60 bg-background/80 p-4'
            >
              <div className='mb-3 flex min-h-8 items-center justify-between gap-3'>
                <div className='text-sm font-semibold'>
                  {employeeUiCopy.certificationsSection.itemTitle}
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className={cn(!isEditing && 'invisible')}
                  onClick={() => onRemove(certification.id)}
                  disabled={!isEditing || isSavePending}
                >
                  {commonUiCopy.delete}
                </Button>
              </div>
              <div className='space-y-4'>
                <EditableItem
                  label={employeeUiCopy.certificationsSection.name}
                  value={certification.name}
                  editing={isEditing}
                  disabled={isSavePending}
                  onChange={(value) => onFieldChange(certification.id, 'name', value)}
                />
                <EditableItem
                  label={employeeUiCopy.certificationsSection.issuer}
                  value={certification.issuedBy}
                  editing={isEditing}
                  disabled={isSavePending}
                  onChange={(value) => onFieldChange(certification.id, 'issuedBy', value)}
                />
                <div className='grid gap-4 sm:grid-cols-2'>
                  <EditableItem
                    label={employeeUiCopy.certificationsSection.issuedDate}
                    value={certification.issuedDate}
                    type='date'
                    editing={isEditing}
                    disabled={isSavePending}
                    onChange={(value) => onFieldChange(certification.id, 'issuedDate', value)}
                  />
                  <EditableItem
                    label={employeeUiCopy.certificationsSection.expiredDate}
                    value={certification.expiredDate}
                    type='date'
                    editing={isEditing}
                    disabled={isSavePending}
                    onChange={(value) => onFieldChange(certification.id, 'expiredDate', value)}
                  />
                </div>
              </div>
              <div className='mt-4 flex min-h-8 flex-wrap gap-2'>
                <EmployeeAttachmentUploadControl
                  fileName={certification.fileName}
                  viewUrl={certification.image}
                  uploading={certification.uploading}
                  disabled={isUploadDisabled}
                  showUpload={isEditing}
                  onFileChange={(file) => onFileChange(certification.id, file)}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className='text-muted-foreground rounded-2xl border border-dashed p-6 text-sm'>
          {employeeUiCopy.certificationsSection.empty}
        </div>
      )}
      {isEditing && certifications.length > 0 && (
        <p className='text-muted-foreground text-xs'>
          {CERTIFICATION_UPLOAD_HINT}
        </p>
      )}
    </div>
  );
}
