'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';

interface EmployeeAttachmentUploadControlProps {
  fileName?: string;
  viewUrl?: string;
  uploading?: boolean;
  disabled?: boolean;
  showUpload?: boolean;
  uploadLabel?: string;
  onFileChange: (file: File) => void;
}

export function EmployeeAttachmentUploadControl({
  fileName,
  viewUrl,
  uploading = false,
  disabled = false,
  showUpload = true,
  uploadLabel = commonUiCopy.upload,
  onFileChange,
}: EmployeeAttachmentUploadControlProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className='flex min-h-8 flex-wrap items-center gap-2'>
      {showUpload ? (
        <>
          <Button
            type='button'
            variant='outline'
            size='sm'
            aria-busy={uploading}
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                {commonUiCopy.loading}
              </>
            ) : uploadLabel}
          </Button>
          <input
            ref={inputRef}
            type='file'
            accept='image/png,image/jpeg,image/webp,application/pdf'
            tabIndex={-1}
            className='sr-only'
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onFileChange(file);
            }}
          />
        </>
      ) : null}
      {fileName ? (
        <span className='text-muted-foreground max-w-full truncate text-xs' title={fileName}>
          {fileName}
        </span>
      ) : null}
      {viewUrl ? (
        <Button asChild variant='ghost' size='sm'>
          <a href={viewUrl} target='_blank' rel='noreferrer'>
            {commonUiCopy.view}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
