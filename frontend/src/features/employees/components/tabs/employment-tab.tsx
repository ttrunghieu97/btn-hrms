'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { SocialInsuranceCard } from "../cards/social-insurance-card";
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { EmployeeContractCard } from '../cards/contract/employee-contract-card';
import type { EmployeeResponseDto } from '@/api/generated/model';

interface EmploymentTabProps {
  employee: EmployeeResponseDto | null;
  canTerminate?: boolean;
  canDelete?: boolean;
  canResetPassword?: boolean;
  onTerminateClick?: () => void;
  onDeleteClick?: () => void;
  onResetPasswordClick?: () => void;
}

export function EmploymentTab({
  employee,
  canTerminate,
  canDelete,
  canResetPassword,
  onTerminateClick,
  onDeleteClick,
  onResetPasswordClick,
}: EmploymentTabProps) {
  if (!employee) return null;

  const assignments = employee.jobAssignments ?? [];

  return (
    <div className='space-y-6'>
      {/* Contract section */}
      <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-all duration-300'>
        <div className='flex items-center gap-3 border-b px-4 py-3'>
          <div className='bg-purple-500/10 p-1.5 rounded-lg text-purple-600'>
            <Icons.page className='size-4' />
          </div>
          <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.employmentContract}</h3>
        </div>
        <div className='px-4 py-3'>
          <EmployeeContractCard employeeId={employee.id} />
        </div>
      </div>

      {/* Position history */}
      <div className='rounded-xl border bg-card/60 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-all duration-300'>
        <div className='flex items-center gap-3 border-b px-4 py-3'>
          <div className='bg-orange-500/10 p-1.5 rounded-lg text-orange-600'>
            <Icons.user className='size-4' />
          </div>
          <div>
            <h3 className='text-sm font-semibold text-foreground/90'>{employeeUiCopy.positionHistory}</h3>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {assignments.length > 0
                ? employeeUiCopy.positionChangesCount(assignments.length)
                : employeeUiCopy.unassignedPositionHistory}
            </p>
          </div>
        </div>
        {assignments.length > 0 && (
          <div className='divide-y'>
            {assignments.map((entry, idx) => (
              <div key={entry.id || idx} className='flex items-center justify-between px-4 py-2.5 text-sm'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <p className='font-medium'>{entry.position?.name ?? '—'}</p>
                    {entry.isPrimary && (
                      <span className='rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
                        {employeeUiCopy.primaryPositionBadge}
                      </span>
                    )}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {entry.startDate ?? ''}
                    {entry.endDate ? ` → ${entry.endDate}` : ` → ${employeeUiCopy.currentDateRangeFallback}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {(canTerminate || canDelete || canResetPassword) && (
        <div className='rounded-lg border border-destructive/20 bg-destructive/5'>
          <div className='border-b border-destructive/20 px-4 py-3'>
            <h3 className='text-sm font-semibold text-destructive'>{employeeUiCopy.manageEmployeeTitle}</h3>
          </div>
          <div className='space-y-3 px-4 py-3'>
            {canTerminate && (
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <p className='text-sm font-medium'>{employeeUiCopy.statusText.terminated}</p>
                  <p className='text-muted-foreground text-xs'>{employeeUiCopy.terminateContractDescription}</p>
                </div>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  onClick={onTerminateClick}
                >
                  <Icons.employee className='mr-1.5 size-4' />
                  {employeeUiCopy.statusText.terminated}
                </Button>
              </div>
            )}
            {canDelete && (
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <p className='text-sm font-medium'>{employeeUiCopy.deleteEmployeeLabel}</p>
                  <p className='text-muted-foreground text-xs'>{employeeUiCopy.deleteEmployeePermanentDesc}</p>
                </div>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  onClick={onDeleteClick}
                >
                  <Icons.trash className='mr-1.5 size-4' />
                  {commonUiCopy.delete}
                </Button>
              </div>
            )}
            {canResetPassword && (
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <p className='text-sm font-medium'>{employeeUiCopy.resetPasswordLabel}</p>
                  <p className='text-muted-foreground text-xs'>{employeeUiCopy.resetPasswordDescription}</p>
                </div>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  onClick={onResetPasswordClick}
                >
                  <Icons.lock className='mr-1.5 size-4' />
                  {employeeUiCopy.table.resetPassword}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <SocialInsuranceCard employeeId={employee.id} />
    </div>
  );
}
