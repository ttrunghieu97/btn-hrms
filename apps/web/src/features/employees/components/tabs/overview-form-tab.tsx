'use client';

import * as React from 'react';
import { employeeUiCopy } from '@/lib/app-copy';
import { EditableItem, EditableSelect, EditableTextarea, Section } from '../form/employee-form-fields';

interface OverviewFormTabProps {
  formValues: {
    lastName: string;
    firstName: string;
    dob: string;
    gender: string;
    identityNumber: string;
    identityDate: string;
    identityPlace: string;
    email: string;
    phoneNumber: string;
    address: string;
  };
  errors: Record<string, string>;
  genderOptions: Array<{ value: string; label: string }>;
  isPending: boolean;
  onFieldChange: (field: string, value: string) => void;
}

export function OverviewFormTab({
  formValues,
  errors,
  genderOptions,
  isPending,
  onFieldChange,
}: OverviewFormTabProps) {
  return (
    <div className='mx-auto max-w-2xl'>
      <Section
        id='employee-personal-contact'
        title={employeeUiCopy.personalSection.title}
        description={employeeUiCopy.personalSection.description}
      >
        <div className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={employeeUiCopy.fields.lastName}
              required
              value={formValues.lastName}
              editing
              disabled={isPending}
              error={errors.lastName}
              onChange={(value) => onFieldChange('lastName', value)}
            />
            <EditableItem
              label={employeeUiCopy.fields.firstName}
              required
              value={formValues.firstName}
              editing
              disabled={isPending}
              error={errors.firstName}
              onChange={(value) => onFieldChange('firstName', value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={employeeUiCopy.fields.dob}
              value={formValues.dob}
              type='date'
              editing
              disabled={isPending}
              error={errors.dob}
              onChange={(value) => onFieldChange('dob', value)}
            />
            <EditableSelect
              label={employeeUiCopy.fields.gender}
              value={formValues.gender}
              displayValue={
                genderOptions.find((opt) => opt.value === formValues.gender)?.label ?? ''
              }
              editing
              disabled={isPending}
              placeholder={employeeUiCopy.fields.genderPlaceholder}
              options={genderOptions}
              error={errors.gender}
              onChange={(value) => onFieldChange('gender', value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={employeeUiCopy.fields.identityNumber}
              value={formValues.identityNumber}
              editing
              disabled={isPending}
              error={errors.identityNumber}
              onChange={(value) => onFieldChange('identityNumber', value)}
            />
            <EditableItem
              label={employeeUiCopy.fields.identityDate}
              value={formValues.identityDate}
              type='date'
              editing
              disabled={isPending}
              error={errors.identityDate}
              onChange={(value) => onFieldChange('identityDate', value)}
            />
          </div>
          <EditableSelect
            label={employeeUiCopy.fields.identityPlace}
            value={formValues.identityPlace}
            displayValue={formValues.identityPlace}
            editing
            disabled={isPending}
            error={errors.identityPlace}
            onChange={(value) => onFieldChange('identityPlace', value)}
            placeholder={employeeUiCopy.fields.identityPlacePlaceholder}
            options={[
              { value: employeeUiCopy.fields.mpsOption, label: employeeUiCopy.fields.mpsOption },
              { value: employeeUiCopy.fields.policeOption, label: employeeUiCopy.fields.policeOption },
            ]}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <EditableItem
              label={employeeUiCopy.fields.email}
              value={formValues.email}
              type='email'
              editing
              disabled={isPending}
              error={errors.email}
              onChange={(value) => onFieldChange('email', value)}
            />
            <EditableItem
              label={employeeUiCopy.fields.phoneNumber}
              value={formValues.phoneNumber}
              type='tel'
              editing
              disabled={isPending}
              error={errors.phoneNumber}
              onChange={(value) => onFieldChange('phoneNumber', value)}
            />
          </div>
          <EditableTextarea
            label={employeeUiCopy.fields.address}
            value={formValues.address}
            editing
            disabled={isPending}
            error={errors.address}
            onChange={(value) => onFieldChange('address', value)}
          />
        </div>
      </Section>
    </div>
  );
}
