'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { getFileName, toAssetUrl } from '../../utils/employee-display';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import type { EmployeeResponseDto, EmployeeDocumentDto, EmployeeCertificationDto } from '@/api/generated/model';

interface DocumentsTabProps {
  employee: EmployeeResponseDto | null;
}

export function DocumentsTab({ employee }: DocumentsTabProps) {
  if (!employee) return null;

  const documents = (employee.documents ?? []) as (EmployeeDocumentDto & { documentType?: string | null; attachment?: { attachmentId: string; url?: string; mimeType?: string; sizeBytes?: number } | null })[];
  const certifications = (employee.certifications ?? []) as (EmployeeCertificationDto & { attachment?: { attachmentId: string; url?: string; mimeType?: string; sizeBytes?: number } | null })[];

  return (
    <div className='space-y-6'>
      {/* Documents */}
      <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-sky-500 hover:shadow-md transition-all duration-300'>
        <div className='flex items-center gap-3 border-b px-4 py-3'>
          <div className='bg-sky-500/10 p-1.5 rounded-lg text-sky-600'>
            <Icons.post className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-foreground/90'>Hồ sơ đính kèm</h3>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {documents.length > 0
                ? `${documents.length} hồ sơ`
                : 'Chưa có hồ sơ nào'}
            </p>
          </div>
        </div>
        {documents.length > 0 ? (
          <div className='divide-y'>
            {documents.map((doc, idx) => {
              const docUrl = doc.attachment
                ? toAssetUrl(doc.attachment.url ?? doc.attachment.attachmentId)
                : (doc as { url?: string }).url ?? '';
              return (
                <div key={idx} className='flex items-center justify-between px-4 py-2.5 text-sm'>
                  <span className='text-foreground/80'>{doc.documentType ?? employeeUiCopy.profileDocumentPrefix(idx + 1)}</span>
                  {docUrl ? (
                    <Button variant='ghost' size='sm' asChild>
                      <a href={docUrl} target='_blank' rel='noopener noreferrer'>
                        <span>{commonUiCopy.view}</span>
                      </a>
                    </Button>
                  ) : (
                    <span className='text-muted-foreground text-xs'>{employeeUiCopy.notUploaded}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
            {employeeUiCopy.noAttachedDocuments}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-indigo-500 hover:shadow-md transition-all duration-300'>
        <div className='flex items-center gap-3 border-b px-4 py-3'>
          <div className='bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600'>
            <Icons.badgeCheck className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.certificationsTitle}</h3>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {certifications.length > 0
                ? employeeUiCopy.certificationsCountSuffix(certifications.length)
                : employeeUiCopy.noCertifications}
            </p>
          </div>
        </div>
        {certifications.length > 0 ? (
          <div className='divide-y'>
            {certifications.map((cert) => {
              const certUrl = cert.attachment
                ? toAssetUrl(cert.attachment.url ?? cert.attachment.attachmentId)
                : (cert as { image?: string }).image ?? '';
              return (
                <div key={cert.id} className='flex items-center justify-between px-4 py-2.5 text-sm'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-medium'>{cert.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {cert.issuedBy && <>{employeeUiCopy.issuedByPrefix}{cert.issuedBy}</>}
                      {cert.expiredDate && <> · {employeeUiCopy.expiredDatePrefix}{cert.expiredDate}</>}
                    </p>
                  </div>
                  {certUrl ? (
                    <Button variant='ghost' size='sm' asChild className='shrink-0'>
                      <a href={certUrl} target='_blank' rel='noopener noreferrer'>
                        <span>{commonUiCopy.view}</span>
                      </a>
                    </Button>
                  ) : (
                    <span className='text-muted-foreground shrink-0 text-xs'>{employeeUiCopy.noFileUploaded}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
            {employeeUiCopy.noCertificationsRecorded}
          </div>
        )}
      </div>
    </div>
  );
}
