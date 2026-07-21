'use client';

import * as React from 'react';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { STATUS_OPTIONS } from '../../utils/employee-form-model';
import { EditableItem, EditableSelect, Section } from '../form/employee-form-fields';
import { Icons } from '@/components/icons';

interface EmploymentFormTabProps {
  formValues: {
    username: string;
    employeeCode: string;
    positionId: string;
    departmentId: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  errors: Record<string, string>;
  isPending: boolean;
  isEditMode: boolean;
  usernameStatus: { checking: boolean; exists: boolean; checkedValue: string };
  employeeCodeStatus: { checking: boolean; exists: boolean; checkedValue: string };
  departmentOptions: Array<{ value: string; label: string }>;
  positionOptions: Array<{ value: string; label: string }>;
  portalContainer: HTMLElement | null;
  onFieldChange: (field: string, value: string) => void;
}

export function EmploymentFormTab({
  formValues,
  errors,
  isPending,
  isEditMode,
  usernameStatus,
  employeeCodeStatus,
  departmentOptions,
  positionOptions,
  portalContainer,
  onFieldChange,
}: EmploymentFormTabProps) {
  return (
    <div className='mx-auto max-w-2xl space-y-6'>
      <Section
        title={employeeUiCopy.systemAccountTitle}
        description={employeeUiCopy.systemAccountDescription}
      >
        <div className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={commonUiCopy.username}
              value={formValues.username}
              editing
              disabled={isPending || isEditMode}
              error={errors.username}
              showSuccessIcon={
                !isEditMode &&
                !usernameStatus.checking &&
                usernameStatus.checkedValue === formValues.username.trim() &&
                !usernameStatus.exists &&
                !!formValues.username.trim()
              }
              statusIcon={
                !isEditMode && usernameStatus.checking ? (
                  <span className='text-muted-foreground' />
                ) : !isEditMode &&
                  usernameStatus.checkedValue === formValues.username.trim() &&
                  usernameStatus.exists &&
                  !!formValues.username.trim() ? (
                  <div className='flex size-4 items-center justify-center rounded-full bg-destructive/10'>
                    <Icons.close className='size-3 text-destructive' />
                  </div>
                ) : null
              }
              onChange={(value) => onFieldChange('username', value)}
            />
            <EditableItem
              label={employeeUiCopy.labels.defaultPassword}
              value='********'
              editing={false}
              disabled
              onChange={() => {}}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={employeeUiCopy.labels.employeeCode}
              required
              value={formValues.employeeCode}
              editing
              disabled={isPending}
              error={errors.employeeCode}
              showSuccessIcon={
                !employeeCodeStatus.checking &&
                employeeCodeStatus.checkedValue === formValues.employeeCode.trim() &&
                !employeeCodeStatus.exists &&
                !!formValues.employeeCode.trim()
              }
              statusIcon={
                employeeCodeStatus.checking ? (
                  <span className='text-muted-foreground' />
                ) : null
              }
              onChange={(value) => onFieldChange('employeeCode', value)}
            />
            <EditableSelect
              label={employeeUiCopy.positionLabel}
              required
              value={formValues.positionId}
              displayValue={
                positionOptions.find((opt) => opt.value === formValues.positionId)?.label ?? ''
              }
              editing
              disabled={isPending}
              placeholder={employeeUiCopy.fields.positionPlaceholder}
              options={positionOptions}
              error={errors.positionId}
              onChange={(value) => onFieldChange('positionId', value)}
              portalContainer={portalContainer}
            />
            <EditableSelect
              label={employeeUiCopy.departmentLabel}
              required
              value={formValues.departmentId}
              displayValue={
                departmentOptions.find((opt) => opt.value === formValues.departmentId)?.label ?? ''
              }
              editing
              disabled={isPending}
              placeholder={employeeUiCopy.fields.departmentPlaceholder}
              options={departmentOptions}
              error={errors.departmentId}
              onChange={(value) => onFieldChange('departmentId', value)}
              portalContainer={portalContainer}
            />
            <EditableSelect
              label={employeeUiCopy.statusLabel}
              value={formValues.status}
              displayValue={
                STATUS_OPTIONS.find((opt) => opt.value === formValues.status)?.label ?? ''
              }
              editing
              disabled={isPending}
              placeholder={employeeUiCopy.fields.statusPlaceholder}
              options={[...STATUS_OPTIONS]}
              error={errors.status}
              onChange={(value) => onFieldChange('status', value)}
              portalContainer={portalContainer}
            />
            <EditableItem
              label={employeeUiCopy.labels.startDate}
              value={formValues.startDate}
              type='date'
              editing
              disabled={isPending}
              error={errors.startDate}
              onChange={(value) => onFieldChange('startDate', value)}
            />
            <EditableItem
              label={employeeUiCopy.labels.endDate}
              value={formValues.endDate}
              type='date'
              editing
              disabled={isPending}
              error={errors.endDate}
              onChange={(value) => onFieldChange('endDate', value)}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
