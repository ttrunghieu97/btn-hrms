'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { getRequestId } from '@/lib/request-id';
import { setBreadcrumbRoleName } from '@/lib/breadcrumb-store';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { commonUiCopy, employeeUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { useAuthStore } from '@/stores/auth-store';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { anyOf } from '@/lib/rbac';
import { permissions } from '@/lib/permissions';
import { getEmployeeName, extractAssetUrl } from '../../utils/employee-display';
import { employeeKeys } from '../../api/queries';
import { EmployeeDeleteDialog } from '../dialogs/employee-delete-dialog';
import { ResetPasswordDialog } from '../dialogs/reset-password-dialog';
import { TerminateEmployeeDialog } from '../dialogs/lifecycle/terminate-employee-dialog';
import { EmployeeTabBar } from '../tabs/employee-tab-bar';
import { OverviewTab } from '../tabs/overview-tab';
import { DocumentsTab } from '../tabs/documents-tab';
import { EmploymentTab } from '../tabs/employment-tab';
import { TimelineTab } from '../tabs/timeline-tab';
import { OverviewFormTab } from '../tabs/overview-form-tab';
import { DocumentsFormTab } from '../tabs/documents-form-tab';
import { EmploymentFormTab } from '../tabs/employment-form-tab';
import {
  useEmployeeQuery,
  useRemoveEmployeeMutation,
  useUpdateEmployeeMutation,
  useResetEmployeePasswordMutation,
  useDepartmentsQuery,
  usePositionsQuery,
} from '../../queries/employee-queries';
import { ApiError } from '@/lib/api-error';
import { getQueryClient } from '@/lib/query-client';
import { extractApiFieldErrors } from '@/lib/form-errors';
import { uploadTempFile } from '@/features/uploads';
import { GENDER_OPTIONS } from '../../utils/employee-form-model';
import {
  validateEmployeeUpload,
  waitForUploadUiPaint,
  stageFieldFile,
  cancelFieldUpload,
} from '../../utils/employee-upload';
import {
  toAssetUrl,
  createLocalId,
} from '../../utils/employee-display';
import { createEmployeeFormSchema, updateEmployeeFormSchema } from '../../schemas/employee.schema';
import {
} from '../../utils/employee-form-model';
import {
  createFormValues,
  buildEmployeePayload,
  type EditFormValues,
  type DocumentField,
  type CertificationField,
} from '../../utils/employee-detail-model';
import { getTabErrorCounts, findFirstErrorTab } from '../../constants/employee-tab-fields';
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
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { BreadcrumbNav } from './breadcrumb-nav';

const VIEW_TABS = [
  { value: 'overview', label: employeeUiCopy.tabs.detailOverview },
  { value: 'documents', label: employeeUiCopy.tabs.detailDocuments },
  { value: 'employment', label: employeeUiCopy.tabs.detailEmployment },
  { value: 'assets', label: employeeUiCopy.tabs.detailAssets },
  { value: 'timeline', label: employeeUiCopy.tabs.detailTimeline },
];

const EDIT_TABS = [
  { value: 'overview', label: employeeUiCopy.tabs.detailOverview },
  { value: 'documents', label: employeeUiCopy.tabs.detailDocuments },
  { value: 'employment', label: employeeUiCopy.tabs.detailEmployment },
  { value: 'assets', label: employeeUiCopy.tabs.detailAssets },
];

interface EmployeeDetailPageProps {
  employeeId: string;
}

export function EmployeeDetailPage({ employeeId }: EmployeeDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = React.useState(() => searchParams.get('tab') ?? 'overview');
  const queryClient = useQueryClient();

  const urlTab = searchParams.get('tab') ?? 'overview';
  React.useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const employeeDetailQuery = useEmployeeQuery(employeeId);
  const currentEmployee = employeeDetailQuery.data ?? null;

  const [mode, setMode] = React.useState<'view' | 'edit'>('view');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = React.useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);

  const user = useAuthStore((state) => state.user);
  const canEdit = anyOf(user, ['employees:edit', 'employees:manage']);
  const canDelete = anyOf(user, ['employees:delete', 'employees:manage']);
  const canResetPassword = anyOf(user, [permissions.employees.resetPassword, 'employees:manage']);
  const showTerminate =
    anyOf(user, ['employees:edit', 'employees:manage']) &&
    currentEmployee?.allowedTransitions?.includes('terminated');

  const avatarUrl = extractAssetUrl(currentEmployee?.avatar);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarUploadError, setAvatarUploadError] = React.useState<string | undefined>();
  const lastAvatarFileRef = React.useRef<File | null>(null);
  const avatarUploadRequestRef = React.useRef(0);
  const [isAvatarUploading, setIsAvatarUploading] = React.useState(false);
  const fieldUploadRequestRef = React.useRef(new Map<string, number>());
  const [fieldUploadKeys, setFieldUploadKeys] = React.useState<Set<string>>(() => new Set());
  const [isAvatarRemoving, setIsAvatarRemoving] = React.useState(false);

  const [formValues, setFormValues] = React.useState<EditFormValues>(() =>
    createFormValues(currentEmployee),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const initialSnapshotRef = React.useRef('');

  /* Reset form when employee changes */
  React.useEffect(() => {
    if (mode === 'edit') return;
    const fresh = createFormValues(currentEmployee);
    setFormValues(fresh);
    initialSnapshotRef.current = JSON.stringify(fresh);
  }, [currentEmployee, mode]);

  /* Sync employee name to global breadcrumb-store */
  const displayName = React.useMemo(() => {
    if (mode === 'edit') {
      return `${formValues.lastName} ${formValues.firstName}`.trim() || currentEmployee?.username || '';
    }
    return currentEmployee ? getEmployeeName(currentEmployee) : '';
  }, [currentEmployee, mode, formValues.lastName, formValues.firstName]);

  React.useEffect(() => {
    if (displayName) {
      setBreadcrumbRoleName(displayName);
    }
    return () => {
      setBreadcrumbRoleName('');
    };
  }, [displayName]);

  const isDirty = React.useMemo(
    () => mode === 'edit' && initialSnapshotRef.current !== '' && JSON.stringify(formValues) !== initialSnapshotRef.current,
    [mode, formValues],
  );

  const departmentsQuery = useDepartmentsQuery();
  const departmentOptions = React.useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departmentsQuery.data],
  );

  const positionsQuery = usePositionsQuery(true);
  const positionOptions = React.useMemo(
    () =>
      (positionsQuery.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    [positionsQuery.data],
  );

  const deleteMutation = useRemoveEmployeeMutation(queryClient, {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all() });
      toast.success(feedbackCopy.success.deleted(feedbackEntity.employee));
      setDeleteOpen(false);
      router.push('/employees');
    },
    onError: (error) => {
      toast.error(getVietnameseApiErrorMessage(error, feedbackCopy.failure.delete(feedbackEntity.employee)));
    }
  });
  const resetPasswordMutation = useResetEmployeePasswordMutation();

  const updateMutation = useUpdateEmployeeMutation(queryClient, {
    onSuccess: (updatedEmployee) => {
      const selectedDepartment = departmentOptions.find(
        (d) => d.value === formValues.departmentId,
      );
      const selectedPosition = positionOptions.find(
        (p) => p.value === formValues.positionId,
      );

      const nextEmployee = {
        ...currentEmployee,
        ...updatedEmployee,
        avatar: updatedEmployee.avatar ?? currentEmployee?.avatar ?? null,
        firstName: updatedEmployee.firstName ?? formValues.firstName.trim(),
        lastName: updatedEmployee.lastName ?? formValues.lastName.trim(),
        employeeCode: updatedEmployee.employeeCode ?? formValues.employeeCode.trim(),
        email: updatedEmployee.email ?? formValues.email.trim(),
        phoneNumber: updatedEmployee.phoneNumber ?? formValues.phoneNumber.trim(),
        address: updatedEmployee.address ?? formValues.address.trim(),
        dob: updatedEmployee.dob ?? (formValues.dob || null),
        gender: updatedEmployee.gender ?? (formValues.gender || null),
        status: updatedEmployee.status ?? (formValues.status || null),
        startDate: updatedEmployee.startDate ?? (formValues.startDate || null),
        endDate: updatedEmployee.endDate ?? (formValues.endDate || null),
        identityNumber: updatedEmployee.identityNumber ?? formValues.identityNumber.trim(),
        identityDate: updatedEmployee.identityDate ?? (formValues.identityDate || null),
        identityPlace:
          updatedEmployee.identityPlace ?? (formValues.identityPlace.trim() || null),
        documents: updatedEmployee.documents ?? currentEmployee?.documents ?? [],
        certifications: updatedEmployee.certifications ?? currentEmployee?.certifications ?? [],
        position: selectedPosition
          ? { id: selectedPosition.value, name: selectedPosition.label, description: null, isActive: true }
          : updatedEmployee.position ?? currentEmployee?.position ?? null,
        department:
          updatedEmployee.department ??
          (selectedDepartment
            ? { id: selectedDepartment.value, name: selectedDepartment.label }
            : currentEmployee?.department ?? null),
      } as EmployeeResponseDto;

      const fresh = createFormValues(nextEmployee);
      setFormValues(fresh);
      initialSnapshotRef.current = JSON.stringify(fresh);
      setErrors({});
      setAvatarPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      toast.success(feedbackCopy.success.saved(feedbackEntity.employee));
      setMode('view');
    },
    onError: (error) => {
      const fieldErrors = extractApiFieldErrors(error);
      if (fieldErrors) {
        setErrors(fieldErrors);
        if (error instanceof ApiError) error.toastShown = true;
        return;
      }
      toast.error(
        getVietnameseApiErrorMessage(error, feedbackCopy.failure.save(feedbackEntity.employee)),
      );
    },
  });

  const isMutating = updateMutation.isPending;
  const isUploading = isAvatarUploading || fieldUploadKeys.size > 0;
  const isPending = isMutating;
  const isSavePending = isMutating || isUploading;

  const handleAvatarUpload = React.useCallback(
    async (file: File) => {
      validateEmployeeUpload(file, 'avatar');
      const previewUrl = URL.createObjectURL(file);
      lastAvatarFileRef.current = file;
      setAvatarUploadError(undefined);
      setAvatarPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return previewUrl;
      });
      setFormValues((current) => ({
        ...current,
        avatar: { status: 'existing', file, previewUrl, tempFileToken: undefined },
      }));

      const requestId = avatarUploadRequestRef.current + 1;
      avatarUploadRequestRef.current = requestId;
      setIsAvatarUploading(true);
      try {
        await waitForUploadUiPaint();
        if (avatarUploadRequestRef.current !== requestId) return;
        const uploaded = await uploadTempFile({
          file,
          purpose: 'avatar',
          draftId: getRequestId(),
        });
        if (avatarUploadRequestRef.current !== requestId) return;
        setFormValues((current) => ({
          ...current,
          avatar: { ...current.avatar, file: undefined, tempFileToken: uploaded.tempFileToken, previewUrl },
        }));
      } catch {
        if (avatarUploadRequestRef.current !== requestId) return;
        setAvatarUploadError(employeeUiCopy.uploadAvatarFailed);
        toast.error(employeeUiCopy.uploadAvatarFailed);
      } finally {
        if (avatarUploadRequestRef.current === requestId) setIsAvatarUploading(false);
      }
    },
    [],
  );

  const handleAvatarRemove = React.useCallback(() => {
    avatarUploadRequestRef.current += 1;
    setIsAvatarUploading(false);
    const currentAvatar = formValues.avatar;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarUploadError(undefined);
    setErrors({});
    lastAvatarFileRef.current = null;
    if (currentAvatar.status === 'existing' && currentAvatar.attachmentId) {
      setFormValues((current) => ({
        ...current,
        avatar: { status: 'removing', attachmentId: currentAvatar.attachmentId },
      }));
    } else {
      setFormValues((current) => ({ ...current, avatar: { status: 'empty' } }));
    }
  }, [avatarPreview, formValues.avatar]);

  const handleDocumentUpload = React.useCallback(
    async (documentId: string, file: File) => {
      validateEmployeeUpload(file, 'document');
      setFormValues((current) => ({
        ...current,
        documents: current.documents.map((doc) =>
          doc.id === documentId
            ? { ...doc, status: 'existing' as const, checked: true, file, fileName: file.name, url: '' }
            : doc,
        ),
      }));
      await stageFieldFile(
        `document:${documentId}`,
        file,
        'document',
        (uploaded) => {
          setFormValues((current) => ({
            ...current,
            documents: current.documents.map((doc) =>
              doc.id === documentId ? { ...doc, file: undefined, tempFileToken: uploaded.tempFileToken } : doc,
            ),
          }));
        },
        { fieldUploadRequestRef, setFieldUploadKeys, draftId: getRequestId() },
      );
    },
    [],
  );

  const handleCertificationUpload = React.useCallback(
    async (certificationId: string, file: File) => {
      validateEmployeeUpload(file, 'certification');
      setFormValues((current) => ({
        ...current,
        certifications: current.certifications.map((cert) =>
          cert.id === certificationId
            ? { ...cert, status: 'existing' as const, file, fileName: file.name, fileUrl: '' }
            : cert,
        ),
      }));
      await stageFieldFile(
        `certification:${certificationId}`,
        file,
        'certification',
        (uploaded) => {
          setFormValues((current) => ({
            ...current,
            certifications: current.certifications.map((cert) =>
              cert.id === certificationId
                ? { ...cert, file: undefined, tempFileToken: uploaded.tempFileToken }
                : cert,
            ),
          }));
        },
        { fieldUploadRequestRef, setFieldUploadKeys, draftId: getRequestId() },
      );
    },
    [],
  );


  const handleFieldChange = React.useCallback((field: string, value: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormValues((current) => ({ ...current, [field]: value }));
  }, []);

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerImagePicker = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
      imageInputRef.current.click();
    }
  };

  const handleImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    try {
      await handleAvatarUpload(file);
    } catch (error: any) {
      toast.error(error?.message ?? feedbackCopy.failure.upload(feedbackEntity.file));
    }
  };

  const handleCancelEdit = () => {
    avatarUploadRequestRef.current += 1;
    setIsAvatarUploading(false);
    fieldUploadRequestRef.current = new Map();
    setFieldUploadKeys(new Set());
    setAvatarPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setAvatarUploadError(undefined);
    lastAvatarFileRef.current = null;
    setIsAvatarRemoving(false);
    const fresh = createFormValues(currentEmployee);
    setFormValues(fresh);
    setErrors({});
    setMode('view');
  };

  const handleSave = async () => {
    const validation = updateEmployeeFormSchema.safeParse({
      email: formValues.email.trim(),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      employeeCode: formValues.employeeCode.trim(),
      departmentId: formValues.departmentId.trim(),
      positionId: formValues.positionId.trim(),
      phoneNumber: formValues.phoneNumber.trim(),
      address: formValues.address.trim(),
      dob: formValues.dob,
      gender: formValues.gender,
      status: formValues.status,
      startDate: formValues.startDate,
      endDate: formValues.endDate,
      identityNumber: formValues.identityNumber.trim(),
      identityDate: formValues.identityDate,
      identityPlace: formValues.identityPlace.trim(),
      certifications: formValues.certifications.map((cert) => ({
        name: cert.name.trim(),
        issuedBy: cert.issuedBy.trim(),
        issuedDate: cert.issuedDate,
        expiredDate: cert.expiredDate,
        evidence: cert.status !== 'empty' ? cert : undefined,
      })),
    });

    if (!validation.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (!key || nextErrors[key]) continue;
        nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);

      const firstErrorField = Object.keys(nextErrors)[0];
      const errorTab = findFirstErrorTab(nextErrors);
      if (errorTab && errorTab !== activeTab) {
        setActiveTab(errorTab);
        const label = VIEW_TABS.find((t) => t.value === errorTab)?.label ?? errorTab;
        toast.error(`${validation.error.issues[0]?.message ?? feedbackCopy.warning.reviewForm}
Kiểm tra tab "${label}"`);
      } else {
        toast.error(validation.error.issues[0]?.message ?? feedbackCopy.warning.reviewForm);
      }
      return;
    }

    let updatedValues = formValues;

    /* Upload pending files */
    if (updatedValues.avatar.file && !updatedValues.avatar.tempFileToken) {
      try {
        const uploaded = await uploadTempFile({
          file: updatedValues.avatar.file,
          purpose: 'avatar',
          draftId: getRequestId(),
        });
        updatedValues = {
          ...updatedValues,
          avatar: { ...updatedValues.avatar, tempFileToken: uploaded.tempFileToken, previewUrl: uploaded.url, file: undefined },
        };
      } catch {
        toast.error(employeeUiCopy.uploadAvatarFailed);
        return;
      }
    }

    for (const doc of updatedValues.documents) {
      if (!doc.file) continue;
      try {
        const uploaded = await uploadTempFile({ file: doc.file, purpose: 'document', draftId: getRequestId() });
        updatedValues = {
          ...updatedValues,
          documents: updatedValues.documents.map((d) =>
            d.id === doc.id ? { ...d, tempFileToken: uploaded.tempFileToken, url: uploaded.url, file: undefined } as DocumentField : d,
          ),
        };
      } catch {
        toast.error(feedbackCopy.failure.upload(feedbackEntity.evidence));
        return;
      }
    }

    for (const cert of updatedValues.certifications) {
      if (!cert.file) continue;
      try {
        const uploaded = await uploadTempFile({ file: cert.file, purpose: 'certification', draftId: getRequestId() });
        updatedValues = {
          ...updatedValues,
          certifications: updatedValues.certifications.map((c) =>
            c.id === cert.id ? { ...c, tempFileToken: uploaded.tempFileToken, fileUrl: uploaded.url, file: undefined } as CertificationField : c,
          ),
        };
      } catch {
        toast.error(feedbackCopy.failure.upload(feedbackEntity.evidence));
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({ id: currentEmployee!.id, data: buildEmployeePayload(updatedValues) });
    } catch {}
  };

  const tabErrorCounts = React.useMemo(() => getTabErrorCounts(errors), [errors]);
  const uploadingDocumentIds = React.useMemo(
    () => new Set([...fieldUploadKeys].filter((k) => k.startsWith('document:')).map((k) => k.slice('document:'.length))),
    [fieldUploadKeys],
  );
  const uploadingCertificationIds = React.useMemo(
    () => new Set([...fieldUploadKeys].filter((k) => k.startsWith('certification:')).map((k) => k.slice('certification:'.length))),
    [fieldUploadKeys],
  );

  const editAvatarUrl =
    avatarPreview ??
    (formValues.avatar.previewUrl
      ? toAssetUrl(formValues.avatar.previewUrl)
      : extractAssetUrl(currentEmployee?.avatar));

  const isEditMode = mode === 'edit';

  if (employeeDetailQuery.isLoading && !currentEmployee) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Icons.spinner className='size-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (employeeDetailQuery.error) {
    return (
      <div className="p-6">
        <QueryErrorAlert
          error={employeeDetailQuery.error}
          subject={employeeUiCopy.listSubject}
          onRetry={() => void employeeDetailQuery.refetch()}
        />
      </div>
    );
  }

  if (!currentEmployee) return null;

  const renderTab = () => {
    if (isEditMode) {
      switch (activeTab) {
        case 'overview':
          return (
            <OverviewFormTab
              formValues={{
                lastName: formValues.lastName,
                firstName: formValues.firstName,
                dob: formValues.dob,
                gender: formValues.gender,
                identityNumber: formValues.identityNumber,
                identityDate: formValues.identityDate,
                identityPlace: formValues.identityPlace,
                email: formValues.email,
                phoneNumber: formValues.phoneNumber,
                address: formValues.address,
              }}
              errors={errors}
              genderOptions={[...GENDER_OPTIONS]}
              isPending={isPending}
              onFieldChange={handleFieldChange}
            />
          );
        case 'documents':
          return (
            <DocumentsFormTab
              documents={formValues.documents.map((doc) => ({
                id: doc.id,
                label: doc.label,
                checked: doc.checked,
                url: doc.url,
                fileName: doc.fileName,
              }))}
              certifications={formValues.certifications.map((cert) => ({
                id: cert.id,
                name: cert.name,
                issuedBy: cert.issuedBy,
                issuedDate: cert.issuedDate,
                expiredDate: cert.expiredDate,
                fileUrl: cert.fileUrl,
                fileName: cert.fileName,
              }))}
              uploadingDocumentIds={uploadingDocumentIds}
              uploadingCertificationIds={uploadingCertificationIds}
              isSubmitting={isMutating}
              isPending={isPending}
              onDocumentCheckedChange={(documentId, checked) => {
                if (!checked) {
                  cancelFieldUpload(`document:${documentId}`, { fieldUploadRequestRef, setFieldUploadKeys, draftId: getRequestId() });
                }
                setFormValues((current) => ({
                  ...current,
                  documents: current.documents.map((item) =>
                    item.id === documentId
                      ? { ...item, checked, ...(!checked ? { file: undefined, tempFileToken: undefined } : {}) }
                      : item,
                  ),
                }));
              }}
              onDocumentFileChange={handleDocumentUpload}
              onAddCertification={() =>
                setFormValues((current) => ({
                  ...current,
                  certifications: [...current.certifications, { id: createLocalId('cert'), name: '', issuedBy: '', issuedDate: '', expiredDate: '', status: 'empty', fileUrl: '', fileName: '' }],
                }))
              }
              onRemoveCertification={(certificationId) => {
                cancelFieldUpload(`certification:${certificationId}`, { fieldUploadRequestRef, setFieldUploadKeys, draftId: getRequestId() });
                setFormValues((current) => ({
                  ...current,
                  certifications: current.certifications.filter((item) => item.id !== certificationId),
                }));
              }}
              onCertificationChange={(certificationId, field, value) =>
                setFormValues((current) => ({
                  ...current,
                  certifications: current.certifications.map((item) =>
                    item.id === certificationId ? { ...item, [field]: value } : item,
                  ),
                }))
              }
              onCertificationFileChange={handleCertificationUpload}
              getAssetUrl={toAssetUrl}
            />
          );
        case 'employment':
          return (
            <EmploymentFormTab
              formValues={{
                username: formValues.username,
                employeeCode: formValues.employeeCode,
                positionId: formValues.positionId,
                departmentId: formValues.departmentId,
                status: formValues.status,
                startDate: formValues.startDate,
                endDate: formValues.endDate,
              }}
              errors={errors}
              isPending={isPending}
              isEditMode
              usernameStatus={{ checking: false, exists: false, checkedValue: '' }}
              employeeCodeStatus={{ checking: false, exists: false, checkedValue: '' }}
              departmentOptions={departmentOptions}
              positionOptions={positionOptions}
              portalContainer={null}
              onFieldChange={handleFieldChange}
            />
          );
      }
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab employee={currentEmployee} isEditing={false} />;
      case 'documents':
        return <DocumentsTab employee={currentEmployee} />;
      case 'employment':
        return (
          <EmploymentTab
            employee={currentEmployee}
            canTerminate={showTerminate ?? false}
            canDelete={canDelete ?? false}
            canResetPassword={canResetPassword ?? false}
            onTerminateClick={() => setTerminateOpen(true)}
            onDeleteClick={() => setDeleteOpen(true)}
            onResetPasswordClick={() => setResetPasswordOpen(true)}
          />
        );
      case 'timeline':
        return <TimelineTab employee={currentEmployee} />;
      default:
        return <OverviewTab employee={currentEmployee} isEditing={false} />;
    }
  };

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0'>
      <div className='rounded-2xl border border-border/40 bg-background shadow-md overflow-hidden'>
        <EmployeeTabBar
          employee={currentEmployee}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            React.startTransition(() => {
              const params = new URLSearchParams(window.location.search);
              params.set('tab', tab);
              router.replace(`/employees/${employeeId}?${params.toString()}`, { scroll: false });
            });
          }}
          avatarUrl={isEditMode ? editAvatarUrl : avatarUrl}
          isEditing={isEditMode}
          showAvatarUploadButton={isEditMode}
          canRemoveAvatar={isEditMode ? (formValues.avatar.status !== 'empty' || !!avatarPreview) : false}
          isPending={isEditMode ? isPending : false}
          isUploading={isEditMode ? isAvatarUploading : false}
          onAvatarUploadClick={isEditMode ? triggerImagePicker : () => {}}
          onAvatarRemoveClick={isEditMode ? handleAvatarRemove : () => {}}
          tabErrorCounts={isEditMode ? tabErrorCounts : undefined}
          tabs={isEditMode ? EDIT_TABS : VIEW_TABS}
          editButton={
            isEditMode ? (
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (isDirty) {
                      setConfirmDiscardOpen(true);
                    } else {
                      handleCancelEdit();
                    }
                  }}
                  disabled={isMutating}
                >
                  {commonUiCopy.cancel}
                </Button>
                <Button type='button' size='sm' onClick={handleSave} disabled={isSavePending}>
                  {updateMutation.isPending ? commonUiCopy.saving : commonUiCopy.save}
                </Button>
              </div>
            ) : (
              canEdit && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setMode('edit')}
                >
                  {commonUiCopy.edit}
                </Button>
              )
            )
          }
        />

        <div className='p-6 bg-muted/5 min-h-[400px]'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={isEditMode ? 'edit-' + activeTab : 'view-' + activeTab}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <EmployeeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!currentEmployee?.id) {
            toast.error(feedbackCopy.warning.employeeNotFound);
            return;
          }
          deleteMutation.mutateAsync(currentEmployee.id).catch(() => {});
        }}
      />

      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        isPending={resetPasswordMutation.isPending}
        employeeName={getEmployeeName(currentEmployee)}
        onConfirm={() => {
          if (!currentEmployee?.id) {
            toast.error(feedbackCopy.warning.employeeNotFound);
            return;
          }
          resetPasswordMutation.mutateAsync(currentEmployee.id, {
            onSuccess: () => {
              toast.success(employeeUiCopy.dialogs.resetPasswordSuccess);
              setResetPasswordOpen(false);
              employeeDetailQuery.refetch();
            },
            onError: (error: unknown) => {
              if (error instanceof ApiError) {
                toast.error(getVietnameseApiErrorMessage(error, feedbackCopy.failure.resetPassword));
              } else {
                toast.error(feedbackCopy.failure.resetPassword);
              }
            },
          }).catch(() => {});
        }}
      />

      <TerminateEmployeeDialog
        employeeId={currentEmployee?.id ?? ''}
        employeeName={getEmployeeName(currentEmployee)}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        onSuccess={() => {
          setTerminateOpen(false);
          employeeDetailQuery.refetch();
        }}
      />

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{employeeUiCopy.detailModal.discardWarnTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {employeeUiCopy.detailModal.discardWarnDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{employeeUiCopy.detailModal.continueEditing}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                setConfirmDiscardOpen(false);
                handleCancelEdit();
              }}
            >
              {employeeUiCopy.detailModal.discardChangesAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden file input for avatar (edit mode) */}
      <input
        ref={imageInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        tabIndex={-1}
        className='sr-only'
        onChange={handleImageInputChange}
      />
    </div>
  );
}
