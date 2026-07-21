'use client';

import * as React from 'react';
import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { EmployeeAvatarUpload } from '../form/employee-avatar-upload';
import { getEmployeeName, formatValue, getInitials } from '../../utils/employee-display';
import { getSmartStatus } from '../../utils/employee-status';
import { AttentionCenter } from './attention-center';
import { employeeUiCopy } from '@/lib/app-copy';
import type { EmployeeResponseDto } from '@/api/generated/model';

function calculateTenure(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 0) return null;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} tháng`;
  if (m === 0) return `${y} năm`;
  return `${y} năm ${m} tháng`;
}

interface EmployeeSummaryHeaderProps {
  employee: EmployeeResponseDto;
  avatarUrl: string | undefined;
  isEditing: boolean;
  showAvatarUploadButton: boolean;
  canRemoveAvatar: boolean;
  isPending: boolean;
  isUploading: boolean;
  onAvatarUploadClick: (trigger: HTMLElement) => void;
  onAvatarRemoveClick: () => void;
}

export function EmployeeSummaryHeader({
  employee,
  avatarUrl,
  isEditing,
  showAvatarUploadButton,
  canRemoveAvatar,
  isPending,
  isUploading,
  onAvatarUploadClick,
  onAvatarRemoveClick,
}: EmployeeSummaryHeaderProps) {
  const tenure = calculateTenure(employee.startDate);

  return (
    <div className='flex items-start gap-5'>
      <EmployeeAvatarUpload
        src={avatarUrl}
        alt={getEmployeeName(employee)}
        fallback={getInitials(employee)}
        editable={showAvatarUploadButton}
        disabled={isPending}
        uploading={isUploading}
        canRemove={canRemoveAvatar}
        onUploadClick={onAvatarUploadClick}
        onRemoveClick={onAvatarRemoveClick}
      />
      <div className='min-w-0 flex-1 space-y-4'>
        <div>
          <div className='mb-2 flex flex-wrap items-center gap-2'>
            <EmployeeStatusBadge status={getSmartStatus(employee).kind} />
            {isEditing && (
              <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
                {employeeUiCopy.footerEditing}
              </span>
            )}
          </div>

          <h2 className='truncate text-lg font-semibold'>
            {getEmployeeName(employee)}
          </h2>

          <p className='text-muted-foreground text-sm'>
            {formatValue(employee.employeeCode)}
            {employee.position?.name && (
              <> · {employee.position.name}</>
            )}
            {employee.department?.name && (
              <> · {employee.department.name}</>
            )}
          </p>

          <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
            {employee.startDate && (
              <span className='inline-flex items-center gap-1'>
                Ngày vào: {employee.startDate}
                {tenure && <> · Thâm niên: {tenure}</>}
              </span>
            )}
            {employee.email && (
              <span className='inline-flex items-center gap-1'>{employee.email}</span>
            )}
            {employee.phoneNumber && (
              <span className='inline-flex items-center gap-1'>{employee.phoneNumber}</span>
            )}
          </div>
        </div>
      {employee.id && <AttentionCenter employee={employee} />}
    </div>
    </div>
  );
}
