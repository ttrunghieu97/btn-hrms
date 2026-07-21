'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import type { EmployeeResponseDto } from '@/api/generated/model';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GENDER_OPTIONS } from '../utils/employee-form-model';
import { toAssetUrl } from '../utils/employee-display';
import { findFirstErrorTab, getTabErrorCounts } from '../constants/employee-tab-fields';
import { useEmployeeForm } from '../hooks/use-employee-form';
import { EmployeeTabBar } from './tabs/employee-tab-bar';
import { OverviewFormTab } from './tabs/overview-form-tab';
import { DocumentsFormTab } from './tabs/documents-form-tab';
import { EmploymentFormTab } from './tabs/employment-form-tab';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const CREATE_TABS = [
  { value: 'overview', label: employeeUiCopy.tabs.detailOverview },
  { value: 'documents', label: employeeUiCopy.tabs.detailDocuments },
  { value: 'employment', label: employeeUiCopy.tabs.detailEmployment },
];

const closeDialogCopy = {
  uploadingTitle: 'Đang tải lên tài liệu',
  unsavedTitle: 'Thay đổi chưa được lưu',
  unsavedDescription: 'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời đi và bỏ tất cả thay đổi?',
};

function buildPlaceholderEmployee(formValues: {
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId: string;
  positionId: string;
  status: string;
  email: string;
  phoneNumber: string;
  departmentOptions: Array<{ value: string; label: string }>;
  positionOptions: Array<{ value: string; label: string }>;
}): EmployeeResponseDto {
  const department = formValues.departmentOptions.find((d) => d.value === formValues.departmentId);
  const position = formValues.positionOptions.find((p) => p.value === formValues.positionId);
  return {
    id: '',
    firstName: formValues.firstName,
    lastName: formValues.lastName,
    employeeCode: formValues.employeeCode,
    status: (formValues.status || 'working') as EmployeeResponseDto['status'],
    email: formValues.email,
    phoneNumber: formValues.phoneNumber,
    department: department ? { id: department.value, name: department.label } : null,
    position: position ? { id: position.value, name: position.label, description: null, isActive: true } : null,
    startDate: null,
    username: null,
    address: null,
    gender: null,
    dob: null,
  } as unknown as EmployeeResponseDto;
}

export function EmployeeCreatePage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isDirty, setIsDirty] = React.useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const pendingJumpRef = React.useRef(false);

  const form = useEmployeeForm({
    open: true,
    onOpenChange: (nextOpen: boolean) => {
      if (!nextOpen) {
        router.push('/employees');
      }
    },
    employee: null,
  });

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (form.isSubmitting) {
          return;
        }
        if (isDirty || form.isUploading) {
          setCloseConfirmOpen(true);
          return;
        }
        router.push('/employees');
      }
    },
    [isDirty, form.isUploading, form.isSubmitting, router],
  );

  const handleSave = React.useCallback(() => {
    pendingJumpRef.current = true;
    form.handleSave();
  }, [form.handleSave]);

  React.useEffect(() => {
    if (pendingJumpRef.current && Object.keys(form.errors).length > 0) {
      pendingJumpRef.current = false;
      const firstTab = findFirstErrorTab(form.errors);
      if (firstTab) setActiveTab(firstTab);
    }
  }, [form.errors]);

  const handleCloseConfirm = React.useCallback(() => {
    setIsDirty(false);
    setCloseConfirmOpen(false);
    router.push('/employees');
  }, [router]);

  // Window beforeunload handling for unsaved edits
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || form.isUploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, form.isUploading]);

  const handleFieldChange = React.useCallback(
    (field: string, value: string) => {
      if (!isDirty) setIsDirty(true);
      form.handleFieldChange(field, value);
    },
    [isDirty, form.handleFieldChange],
  );

  const handleDocumentCheckedChange = React.useCallback(
    (documentId: string, checked: boolean) => {
      if (!isDirty) setIsDirty(true);
      form.handleDocumentCheckedChange(documentId, checked);
    },
    [isDirty, form.handleDocumentCheckedChange],
  );

  const handleDocumentFileChange = React.useCallback(
    (documentId: string, file: File) => {
      if (!isDirty) setIsDirty(true);
      form.handleDocumentFileChange(documentId, file);
    },
    [isDirty, form.handleDocumentFileChange],
  );

  const handleCertificationChange = React.useCallback(
    (certificationId: string, field: string, value: string) => {
      if (!isDirty) setIsDirty(true);
      form.handleCertificationChange(certificationId, field, value);
    },
    [isDirty, form.handleCertificationChange],
  );

  const handleCertificationFileChange = React.useCallback(
    (certificationId: string, file: File) => {
      if (!isDirty) setIsDirty(true);
      form.handleCertificationEvidenceChange(certificationId, file);
    },
    [isDirty, form.handleCertificationEvidenceChange],
  );

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.handleInputFileChange(e);
    },
    [form.handleInputFileChange],
  );

  const displayEmployee = React.useMemo(
    () => buildPlaceholderEmployee({
      firstName: form.formValues.firstName,
      lastName: form.formValues.lastName,
      employeeCode: form.formValues.employeeCode,
      departmentId: form.formValues.departmentId,
      positionId: form.formValues.positionId,
      status: form.formValues.status,
      email: form.formValues.email,
      phoneNumber: form.formValues.phoneNumber,
      departmentOptions: form.departmentOptions,
      positionOptions: form.positionOptions,
    }),
    [
      form.formValues.firstName,
      form.formValues.lastName,
      form.formValues.employeeCode,
      form.formValues.departmentId,
      form.formValues.positionId,
      form.formValues.status,
      form.formValues.email,
      form.formValues.phoneNumber,
      form.departmentOptions,
      form.positionOptions,
    ],
  );

  const tabErrorCounts = React.useMemo(() => getTabErrorCounts(form.errors), [form.errors]);
  const getAssetUrl = React.useCallback((value: string) => value, []);

  return (
    <>
      <div className='flex flex-col h-full min-h-0 w-full bg-background rounded-2xl border border-border/60 overflow-hidden shadow-sm'>
        <EmployeeTabBar
          employee={displayEmployee}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          avatarUrl={form.avatarUrl}
          isEditing={true}
          showAvatarUploadButton={true}
          canRemoveAvatar={!!form.avatarUrl}
          isPending={form.isPending}
          isUploading={form.isAvatarUploading}
          onAvatarUploadClick={form.triggerAvatarPicker}
          onAvatarRemoveClick={form.handleAvatarRemove}
          tabErrorCounts={tabErrorCounts}
          tabs={CREATE_TABS}
          editButton={
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleOpenChange(false)}
                disabled={form.isCancelDisabled}
              >
                {commonUiCopy.cancel}
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={handleSave}
                disabled={form.isSaveDisabled}
              >
                {form.isCreating ? (
                  <>
                    <Icons.spinner className='mr-1.5 h-4 w-4 animate-spin' />
                    {commonUiCopy.creating}
                  </>
                ) : (
                  employeeUiCopy.actions.addEmployee
                )}
              </Button>
            </div>
          }
        />

        <div className='flex-1 overflow-y-auto bg-muted/5 px-8 py-6 min-h-0'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={activeTab}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{ willChange: 'transform, opacity' }}
              className='min-h-full flex flex-col'
            >
              {activeTab === 'overview' && (
                <OverviewFormTab
                  formValues={{
                    lastName: form.formValues.lastName,
                    firstName: form.formValues.firstName,
                    dob: form.formValues.dob,
                    gender: form.formValues.gender,
                    identityNumber: form.formValues.identityNumber,
                    identityDate: form.formValues.identityDate,
                    identityPlace: form.formValues.identityPlace,
                    email: form.formValues.email,
                    phoneNumber: form.formValues.phoneNumber,
                    address: form.formValues.address,
                  }}
                  errors={form.errors}
                  genderOptions={[...GENDER_OPTIONS]}
                  isPending={form.isPending}
                  onFieldChange={handleFieldChange}
                />
              )}
              {activeTab === 'documents' && (
                <DocumentsFormTab
                  documents={form.formValues.documents.map((doc) => ({
                    ...doc,
                    url: doc.existingUrl ?? '',
                  }))}
                  certifications={form.formValues.certifications.map((cert) => ({
                    ...cert,
                    fileUrl: cert.evidenceUrl ?? '',
                    fileName: cert.evidenceFileName ?? '',
                  }))}
                  uploadingDocumentIds={form.uploadingDocumentIds}
                  uploadingCertificationIds={form.uploadingCertificationIds}
                  isSubmitting={form.isSubmitting}
                  isPending={form.isPending}
                  onDocumentCheckedChange={handleDocumentCheckedChange}
                  onDocumentFileChange={handleDocumentFileChange}
                  onAddCertification={form.handleAddCertification}
                  onRemoveCertification={form.handleRemoveCertification}
                  onCertificationChange={handleCertificationChange}
                  onCertificationFileChange={handleCertificationFileChange}
                  getAssetUrl={toAssetUrl}
                />
              )}
              {activeTab === 'employment' && (
                <EmploymentFormTab
                  formValues={{
                    username: form.formValues.username,
                    employeeCode: form.formValues.employeeCode,
                    positionId: form.formValues.positionId,
                    departmentId: form.formValues.departmentId,
                    status: form.formValues.status,
                    startDate: form.formValues.startDate,
                    endDate: form.formValues.endDate,
                  }}
                  errors={form.errors}
                  isPending={form.isPending}
                  isEditMode={form.isEditMode}
                  usernameStatus={form.usernameStatus}
                  employeeCodeStatus={form.employeeCodeStatus}
                  departmentOptions={form.departmentOptions}
                  positionOptions={form.positionOptions}
                  portalContainer={null}
                  onFieldChange={handleFieldChange}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden file input for avatar */}
      <input
        ref={form.avatarInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        tabIndex={-1}
        className='sr-only'
        onChange={handleFileInputChange}
      />

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {form.isUploading ? closeDialogCopy.uploadingTitle : closeDialogCopy.unsavedTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closeDialogCopy.unsavedDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{commonUiCopy.confirm}</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90'
              onClick={handleCloseConfirm}
            >
              {commonUiCopy.cancel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
