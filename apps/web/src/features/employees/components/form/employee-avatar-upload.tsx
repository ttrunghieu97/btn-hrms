'use client';

import * as React from 'react';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const AVATAR_UPLOAD_HINT = ['PNG', 'JPG', 'WEBP'].join(', ') + ' &bull; Toi da 5MB';

interface EmployeeAvatarUploadProps {
  src?: string;
  alt: string;
  fallback: React.ReactNode;
  editable: boolean;
  disabled?: boolean;
  uploading?: boolean;
  canRemove?: boolean;
  onUploadClick: (trigger: HTMLElement) => void;
  onRemoveClick: () => void;
}

export function EmployeeAvatarUpload({
  src,
  alt,
  fallback,
  editable,
  disabled,
  uploading = false,
  canRemove,
  onUploadClick,
  onRemoveClick
}: EmployeeAvatarUploadProps) {
  return (
    <div className='flex flex-col items-center gap-3'>
      <div className='relative'>
        <Avatar className='h-60 w-60 border-4 border-background shadow-sm'>
          <AvatarImage src={src} alt={alt} className='object-cover' />
          <AvatarFallback className='bg-muted text-lg font-semibold'>{fallback}</AvatarFallback>
        </Avatar>
        {uploading ? (
          <div className='absolute inset-0 flex items-center justify-center rounded-full bg-background/55 backdrop-blur-[1px]'>
            <Icons.spinner className='size-7 animate-spin text-primary' />
            <span className='sr-only'>{commonUiCopy.loading}</span>
          </div>
        ) : null}

        {editable && (
          <div className='absolute right-3 bottom-3 flex gap-2'>
            {canRemove && (
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-10 rounded-full border border-border/60 bg-background shadow-sm'
                disabled={disabled || uploading}
                onClick={onRemoveClick}
              >
                <Icons.close className='size-5 text-destructive' />
                <span className='sr-only'>{employeeUiCopy.avatar.remove}</span>
              </Button>
            )}

            <Button
              type='button'
              variant='outline'
              size='icon'
              className='size-10 rounded-full border border-border/60 bg-background shadow-sm'
              disabled={disabled || uploading}
              onClick={(event) => onUploadClick(event.currentTarget)}
            >
              <Icons.media className='size-5' />
              <span className='sr-only'>{employeeUiCopy.avatar.upload}</span>
            </Button>
          </div>
        )}
      </div>

      {editable && (
        <p className='text-muted-foreground text-xs'>{AVATAR_UPLOAD_HINT}</p>
      )}
    </div>
  );
}
