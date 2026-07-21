"use client";

import * as React from "react";
import type { EmployeeResponseDto } from "@/api/generated/model";
import { Icons } from "@/components/icons";
import { commonUiCopy, employeeUiCopy } from "@/lib/app-copy";
import { ApiError } from "@/lib/api-error";
import { getVietnameseApiErrorMessage } from "@/lib/api-error-message";
import { getBackendErrorContract } from "@/lib/error-contract-registry";
import { toProtectedAssetUrl } from "@/lib/asset-url";
import { feedbackCopy, feedbackEntity } from "@/lib/feedback-copy";
import { extractApiFieldErrors } from "@/lib/form-errors";
import { getQueryClient } from "@/lib/query-client";
import { toast } from "sonner";
import { uploadTempFile } from "@/features/uploads";
import { getRequestId } from "@/lib/request-id";
import {
  checkEmployeeCodeAvailability,
  checkEmployeeUsernameAvailability,
  useDepartmentsQuery,
  usePositionsQuery,
  useCreateEmployeeMutation,
  useEmployeeQuery,
  useUpdateEmployeeMutation,
  buildEmployeeUpdateRequestBody,
  type UpdateEmployeePayload,
} from "../queries/employee-queries";
import { createEmployeeFormSchema } from "../schemas/employee.schema";
import {
  buildEmployeeTextPayload,
  createEmployeeFormValues,
  createEmptyEmployeeFormValues,
  COMPANY_DOCUMENT_OPTIONS,
  type EmployeeFormValues,
  type EmployeeDocumentFormField,
  type EmployeeCertificationFormField,
} from "../utils/employee-form-model";
import { buildEmployeeAttachmentPayload } from "../utils/build-employee-attachment-payload";
import { resolveEmployeeAvatarSrc } from "../components/form/employee-avatar-preview";
import { useStore } from "@tanstack/react-form";
import { useAppForm } from "@/components/ui/tanstack-form";
import {
  validateEmployeeUpload,
  waitForUploadUiPaint,
  stageFieldFile,
  cancelFieldUpload,
} from "../utils/employee-upload";

interface CreateFormValues extends EmployeeFormValues {}

function getFileName(value: string) {
  if (!value.trim()) return "";
  const source = value.split("?")[0];
  const parts = source.split("/");
  return decodeURIComponent(parts[parts.length - 1] ?? "");
}

function createEmptyForm(): CreateFormValues {
  return {
    ...createEmptyEmployeeFormValues(),
    documents: COMPANY_DOCUMENT_OPTIONS.map((opt) => ({
      id: opt.id,
      documentType: opt.id,
      label: opt.label,
      checked: false,
      fileName: "",
    })),
  };
}

function sanitizeVietnameseString(value: string) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function buildUsernameFromName(firstName: string, lastName: string) {
  const first = sanitizeVietnameseString(firstName).replace(/\s+/g, "");
  const initials = sanitizeVietnameseString(lastName)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return `${first}${initials}`;
}

export interface UseEmployeeFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeResponseDto | null;
}

export interface UseEmployeeFormReturn {
  sheetContentRef: React.RefObject<HTMLDivElement | null>;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  formValues: CreateFormValues;
  errors: Record<string, string>;
  usernameStatus: { checking: boolean; exists: boolean; checkedValue: string };
  employeeCodeStatus: { checking: boolean; exists: boolean; checkedValue: string };
  avatarUrl: string | undefined;
  isEditMode: boolean;
  isSubmitting: boolean;
  isCreating: boolean;
  isUploading: boolean;
  isAvatarUploading: boolean;
  isPending: boolean;
  isSaveDisabled: boolean;
  isCancelDisabled: boolean;
  uploadingDocumentIds: ReadonlySet<string>;
  uploadingCertificationIds: ReadonlySet<string>;
  departmentOptions: Array<{ value: string; label: string }>;
  positionOptions: Array<{ value: string; label: string }>;
  handleSave: () => void;
  handleFieldChange: (field: string, value: string) => void;
  handleAvatarFileChange: (file: File | null) => void;
  handleAvatarRemove: () => void;
  handleDocumentCheckedChange: (documentId: string, checked: boolean) => void;
  handleDocumentFileChange: (documentId: string, file: File | null) => void;
  triggerAvatarPicker: (trigger: HTMLElement) => void;
  handleAddCertification: () => void;
  handleRemoveCertification: (certificationId: string) => void;
  handleCertificationChange: (certificationId: string, field: string, value: string) => void;
  handleCertificationEvidenceChange: (certificationId: string, file: File | null) => void;
  handleInputFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useEmployeeForm({
  open,
  onOpenChange,
  employee: employeeProp = null,
}: UseEmployeeFormOptions): UseEmployeeFormReturn {
  const sheetContentRef = React.useRef<HTMLDivElement | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastPickerTriggerRef = React.useRef<HTMLElement | null>(null);
  const draftIdRef = React.useRef(getRequestId());

  const form = useAppForm({
    defaultValues: createEmptyForm() as CreateFormValues,
  });
  const formValues = useStore(form.store, (state) => state.values) as CreateFormValues;
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = React.useState(false);
  const [isStagingForSave, setIsStagingForSave] = React.useState(false);
  const avatarUploadRequestRef = React.useRef(0);
  const fieldUploadRequestRef = React.useRef(new Map<string, number>());
  const [fieldUploadKeys, setFieldUploadKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [usernameStatus, setUsernameStatus] = React.useState({
    checking: false,
    exists: false,
    checkedValue: "",
  });
  const usernameCheckRequestRef = React.useRef(0);

  const [employeeCodeStatus, setEmployeeCodeStatus] = React.useState({
    checking: false,
    exists: false,
    checkedValue: "",
  });
  const employeeCodeCheckRequestRef = React.useRef(0);

  const queryClient = getQueryClient();
  const isEditMode = Boolean(employeeProp);
  const employeeIdentifier = employeeProp?.id ?? employeeProp?.username ?? "";
  const employeeDetailQuery = useEmployeeQuery(
    open && employeeIdentifier ? employeeIdentifier : "",
  );
  const resolvedEmployee = isEditMode
    ? (employeeDetailQuery.data ?? employeeProp)
    : null;

  const departmentsQuery = useDepartmentsQuery();
  const departmentOptions = React.useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [departmentsQuery.data],
  );

  const positionsQuery = usePositionsQuery();
  const positionOptions = React.useMemo(() => {
    return (positionsQuery.data ?? []).map((p) => ({ value: p.id, label: p.name }));
  }, [positionsQuery.data]);

  const createMutation = useCreateEmployeeMutation(queryClient, {
    onSuccess: async (employee) => {
      setIsStagingForSave(false);
      toast.success(feedbackCopy.success.createdNew(feedbackEntity.employee));
      onOpenChange(false);
    },
    onError: (error) => {
      setIsStagingForSave(false);
      const fieldErrors = extractApiFieldErrors(error);
      if (fieldErrors) {
        setErrors(fieldErrors);
        if (error instanceof ApiError) error.toastShown = true;
        return;
      }
      toast.error(
        getVietnameseApiErrorMessage(error, feedbackCopy.failure.create(feedbackEntity.employee)),
      );
    },
  });

  const updateMutation = useUpdateEmployeeMutation(queryClient, {
    onSuccess: () => {
      setIsStagingForSave(false);
      toast.success(feedbackCopy.success.saved(feedbackEntity.employee));
      onOpenChange(false);
    },
    onError: (error) => {
      setIsStagingForSave(false);
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

  React.useEffect(() => {
    if (!open) {
      avatarUploadRequestRef.current += 1;
      setIsAvatarUploading(false);
      setIsStagingForSave(false);
      fieldUploadRequestRef.current.forEach((requestId, key) => {
        fieldUploadRequestRef.current.set(key, requestId + 1);
      });
      setFieldUploadKeys(new Set());
      return;
    }
    const nextForm = resolvedEmployee
      ? createEmployeeFormValues(resolvedEmployee)
      : createEmptyForm();
    form.reset(nextForm as CreateFormValues);
    setErrors({});
    setAvatarPreview(null);
    setUsernameStatus({ checking: false, exists: false, checkedValue: "" });
    setEmployeeCodeStatus({ checking: false, exists: false, checkedValue: "" });
  }, [open, resolvedEmployee, form]);

  React.useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  React.useEffect(() => {
    if (!open) return;
    if (isEditMode) {
      setUsernameStatus({ checking: false, exists: false, checkedValue: "" });
      return;
    }

    const username = formValues.username?.trim() ?? "";
    if (!username) {
      setUsernameStatus({ checking: false, exists: false, checkedValue: "" });
      return;
    }

    const requestId = usernameCheckRequestRef.current + 1;
    usernameCheckRequestRef.current = requestId;
    setUsernameStatus((cur) => ({
      checking: true,
      exists: cur.checkedValue === username ? cur.exists : false,
      checkedValue: cur.checkedValue,
    }));

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkEmployeeUsernameAvailability(username);
        if (usernameCheckRequestRef.current !== requestId) return;

        setUsernameStatus({
          checking: false,
          exists: result.exists,
          checkedValue: username,
        });

        if (result.exists) {
          setErrors((cur) => ({ ...cur, username: feedbackCopy.warning.usernameExists }));
        } else {
          clearFieldError("username");
        }
      } catch {
        if (usernameCheckRequestRef.current !== requestId) return;
        setUsernameStatus({ checking: false, exists: false, checkedValue: "" });
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formValues.username, isEditMode, open]);

  React.useEffect(() => {
    if (!open || isEditMode) return;

    const code = formValues.employeeCode.trim();
    if (!code) {
      setEmployeeCodeStatus({ checking: false, exists: false, checkedValue: "" });
      return;
    }

    const requestId = employeeCodeCheckRequestRef.current + 1;
    employeeCodeCheckRequestRef.current = requestId;
    setEmployeeCodeStatus((cur) => ({
      checking: true,
      exists: cur.checkedValue === code ? cur.exists : false,
      checkedValue: cur.checkedValue,
    }));

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkEmployeeCodeAvailability(code);
        if (employeeCodeCheckRequestRef.current !== requestId) return;

        setEmployeeCodeStatus({
          checking: false,
          exists: result.exists,
          checkedValue: code,
        });

        if (result.exists) {
          setErrors((cur) => ({
            ...cur,
            employeeCode: feedbackCopy.warning.employeeCodeExists,
          }));
        } else {
          clearFieldError("employeeCode");
        }
      } catch {
        if (employeeCodeCheckRequestRef.current !== requestId) return;
        setEmployeeCodeStatus({ checking: false, exists: false, checkedValue: "" });
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formValues.employeeCode, isEditMode, open]);

  const avatarUrl = resolveEmployeeAvatarSrc({
    localPreviewUrl: avatarPreview,
    uploadedPreviewUrl: formValues.avatarExistingUrl
      ? toProtectedAssetUrl(formValues.avatarExistingUrl)
      : undefined,
    uploadedPreviewLoaded: !avatarPreview,
  });
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isCreating = createMutation.isPending;
  const isUploading = isAvatarUploading || isStagingForSave || fieldUploadKeys.size > 0;
  const isPending = isSubmitting;
  const isSaveDisabled = isSubmitting || isUploading;
  const isCancelDisabled = isSubmitting;

  function clearFieldError(field: string) {
    setErrors((cur) => {
      if (!cur[field]) return cur;
      const next = { ...cur };
      delete next[field];
      return next;
    });
  }

  function updateNameField(field: "firstName" | "lastName", value: string) {
    clearFieldError(field);
    const newFirstName = field === "firstName" ? value : formValues.firstName;
    const newLastName = field === "lastName" ? value : formValues.lastName;
    form.setFieldValue(field, value);
    const currentName = buildUsernameFromName(formValues.firstName, formValues.lastName);
    if (!formValues.username || formValues.username === currentName) {
      form.setFieldValue("username", buildUsernameFromName(newFirstName, newLastName));
    }
  }

  function handleFieldChange(field: string, value: string) {
    switch (field) {
      case "firstName":
      case "lastName":
        updateNameField(field, value);
        return;
      default:
        break;
    }
    clearFieldError(field);
    form.setFieldValue(field as keyof CreateFormValues, value);
  }

  /** Clean up after native file picker closes */
  function restoreFocusAfterPicker() {
    if (typeof document !== "undefined") document.body.style.pointerEvents = "";
    requestAnimationFrame(() => {
      lastPickerTriggerRef.current?.focus();
      lastPickerTriggerRef.current = null;
    });
  }

  function triggerAvatarPicker(trigger: HTMLElement) {
    lastPickerTriggerRef.current = trigger;
    avatarInputRef.current?.click();
  }

  function handleAvatarFileChange(file: File | null) {
    if (!file) return;
    try {
      validateEmployeeUpload(file, "avatar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : feedbackCopy.failure.upload(feedbackEntity.file));
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    form.setFieldValue("avatarFile", file);
    form.setFieldValue("avatarTempFileToken", undefined);
    form.setFieldValue("avatarRemoved", false);
    const requestId = avatarUploadRequestRef.current + 1;
    avatarUploadRequestRef.current = requestId;
    setIsAvatarUploading(true);
    void waitForUploadUiPaint()
      .then(() => {
        if (avatarUploadRequestRef.current !== requestId) return null;
        return uploadTempFile({
          file,
          purpose: "avatar",
          draftId: draftIdRef.current,
        });
      })
      .then((uploaded) => {
        if (!uploaded) return;
        if (avatarUploadRequestRef.current !== requestId) return;
        form.setFieldValue("avatarTempFileToken", uploaded.tempFileToken);
        form.setFieldValue("avatarFile", undefined);
      })
      .catch((error) => {
        if (avatarUploadRequestRef.current !== requestId) return;
        toast.error(
          error instanceof Error
            ? error.message
            : feedbackCopy.failure.upload(feedbackEntity.file),
        );
      })
      .finally(() => {
        if (avatarUploadRequestRef.current === requestId) {
          setIsAvatarUploading(false);
        }
      });
  }

  function handleAvatarRemove() {
    avatarUploadRequestRef.current += 1;
    setIsAvatarUploading(false);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    form.setFieldValue("avatarFile", undefined);
    form.setFieldValue("avatarTempFileToken", undefined);
    form.setFieldValue("avatarRemoved", Boolean(formValues.avatarAttachmentId));
    form.setFieldValue("avatarExistingUrl", undefined);
    form.setFieldValue("avatarPreview", undefined);
  }

  function handleDocumentFileChange(documentId: string, file: File | null) {
    if (file) {
      try {
        validateEmployeeUpload(file, "document");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : feedbackCopy.failure.upload(feedbackEntity.file));
        return;
      }
    }
    const docs = form.getFieldValue("documents");
    form.setFieldValue(
      "documents",
      docs.map((d: EmployeeDocumentFormField) =>
        d.id === documentId
          ? {
              ...d,
              file: file ?? undefined,
              fileName: file?.name ?? d.fileName,
              checked: file ? true : d.checked,
            }
          : d,
      ),
    );
    if (file) {
      void stageFieldFile(`document:${documentId}`, file, "document", (uploaded) => {
        const current = form.getFieldValue("documents");
        form.setFieldValue(
          "documents",
          current.map((item: EmployeeDocumentFormField) =>
            item.id === documentId
              ? {
                  ...item,
                  file: undefined,
                  tempFileToken: uploaded.tempFileToken,
                }
              : item,
          ),
        );
      }, { fieldUploadRequestRef, setFieldUploadKeys, draftId: draftIdRef.current });
    }
  }

  function handleCertificationEvidenceChange(certificationId: string, file: File | null) {
    if (file) {
      try {
        validateEmployeeUpload(file, "certification");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : feedbackCopy.failure.upload(feedbackEntity.file));
        return;
      }
    }
    const certs = form.getFieldValue("certifications");
    form.setFieldValue(
      "certifications",
      certs.map((c: EmployeeCertificationFormField) =>
        c.id === certificationId
          ? {
              ...c,
              evidenceFile: file ?? undefined,
              evidenceFileName: file?.name ?? c.evidenceFileName,
            }
          : c,
      ),
    );
    if (file) {
      void stageFieldFile(
        `certification:${certificationId}`,
        file,
        "certification",
        (uploaded) => {
          const current = form.getFieldValue("certifications");
          form.setFieldValue(
            "certifications",
            current.map((item: EmployeeCertificationFormField) =>
              item.id === certificationId
                ? {
                    ...item,
                    evidenceFile: undefined,
                    evidenceTempFileToken: uploaded.tempFileToken,
                  }
                : item,
            ),
          );
        },
        { fieldUploadRequestRef, setFieldUploadKeys, draftId: draftIdRef.current },
      );
    }
  }

  async function handleSave() {
    const validation = createEmployeeFormSchema.safeParse({
      username: formValues.username?.trim() ?? "",
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
        evidence: undefined,
      })),
    });

    if (!validation.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (!key || nextErrors[key]) continue;
        nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error(validation.error.issues[0]?.message ?? feedbackCopy.warning.reviewForm);
      return;
    }

    if (!isEditMode && usernameStatus.checking) {
      toast.error(feedbackCopy.warning.usernameChecking);
      return;
    }

    if (
      !isEditMode &&
      usernameStatus.checkedValue === (formValues.username?.trim() ?? "") &&
      usernameStatus.exists
    ) {
      setErrors((cur) => ({ ...cur, username: feedbackCopy.warning.usernameExists }));
      toast.error(feedbackCopy.warning.usernameExists);
      return;
    }

    if (!isEditMode && employeeCodeStatus.checking) {
      toast.error(feedbackCopy.warning.employeeCodeChecking);
      return;
    }

    if (
      !isEditMode &&
      employeeCodeStatus.checkedValue === formValues.employeeCode.trim() &&
      employeeCodeStatus.exists
    ) {
      setErrors((cur) => ({
        ...cur,
        employeeCode: feedbackCopy.warning.employeeCodeExists,
      }));
      toast.error(feedbackCopy.warning.employeeCodeExists);
      return;
    }

    const invalidCertification = formValues.certifications.find((c) => {
      const hasAny =
        c.name.trim() || c.issuedBy.trim() || c.issuedDate || c.expiredDate || c.evidenceFile;
      if (!hasAny) return false;
      return !(c.name.trim() && c.issuedBy.trim() && c.issuedDate);
    });

    if (invalidCertification) {
      toast.error(feedbackCopy.warning.certificationIncomplete);
      return;
    }

    setErrors({});

    setIsStagingForSave(true);
    try {
      const stagedValues = await stageEmployeeFiles(formValues);
      const textPayload = buildEmployeeTextPayload(stagedValues, { includeUsername: !isEditMode });
      const attachmentPayload = buildEmployeeAttachmentPayload(stagedValues);
      const payload: UpdateEmployeePayload = {
        ...textPayload,
        ...attachmentPayload,
      };

      if (isEditMode) {
        if (!resolvedEmployee?.id) {
          toast.error(feedbackCopy.warning.employeeNotFound);
          setIsStagingForSave(false);
          return;
        }

        updateMutation.mutate({ id: resolvedEmployee.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      toast.error(feedbackCopy.failure.save(feedbackEntity.employee));
      setIsStagingForSave(false);
    }
  }

  async function stageEmployeeFiles(values: EmployeeFormValues): Promise<EmployeeFormValues> {
    let stagedValues = values;

    if (values.avatarFile && !values.avatarTempFileToken) {
      validateEmployeeUpload(values.avatarFile, "avatar");
      const uploaded = await uploadTempFile({
        file: values.avatarFile,
        purpose: "avatar",
        draftId: draftIdRef.current,
      });
      stagedValues = {
        ...stagedValues,
        avatarTempFileToken: uploaded.tempFileToken,
      };
    }

    const docsWithFiles = values.documents.filter((d) => d.checked && d.file);
    for (const doc of docsWithFiles) {
      validateEmployeeUpload(doc.file!, "document");
      const uploaded = await uploadTempFile({
        file: doc.file!,
        purpose: "document",
        draftId: draftIdRef.current,
      });
      stagedValues = {
        ...stagedValues,
        documents: stagedValues.documents.map((item) =>
          item.id === doc.id
            ? { ...item, tempFileToken: uploaded.tempFileToken }
            : item,
        ),
      };
    }

    const certsWithFiles = values.certifications.filter((c) => c.evidenceFile);
    for (const cert of certsWithFiles) {
      validateEmployeeUpload(cert.evidenceFile!, "certification");
      const uploaded = await uploadTempFile({
        file: cert.evidenceFile!,
        purpose: "certification",
        draftId: draftIdRef.current,
      });
      stagedValues = {
        ...stagedValues,
        certifications: stagedValues.certifications.map((item) =>
          item.id === cert.id
            ? { ...item, evidenceTempFileToken: uploaded.tempFileToken }
            : item,
        ),
      };
    }

    return stagedValues;
  }

  function handleDocumentCheckedChange(documentId: string, checked: boolean) {
    if (!checked) {
      cancelFieldUpload(`document:${documentId}`, { fieldUploadRequestRef, setFieldUploadKeys, draftId: draftIdRef.current });
    }
    const docs = form.getFieldValue("documents");
    form.setFieldValue(
      "documents",
      docs.map((item: EmployeeDocumentFormField) =>
        item.id === documentId
          ? {
              ...item,
              checked,
              ...(!checked
                ? { file: undefined, tempFileToken: undefined }
                : {}),
            }
          : item,
      ),
    );
  }

  function handleAddCertification() {
    const newCert: EmployeeCertificationFormField = {
      id: `cert-${getRequestId()}`,
      name: "",
      issuedBy: "",
      issuedDate: "",
      expiredDate: "",
    };
    const certs = form.getFieldValue("certifications");
    form.setFieldValue("certifications", [...certs, newCert]);
  }

  function handleRemoveCertification(certificationId: string) {
    cancelFieldUpload(`certification:${certificationId}`, { fieldUploadRequestRef, setFieldUploadKeys, draftId: draftIdRef.current });
    const certs = form.getFieldValue("certifications");
    form.setFieldValue(
      "certifications",
      certs.filter((c: EmployeeCertificationFormField) => c.id !== certificationId),
    );
  }

  function handleCertificationChange(certificationId: string, field: string, value: string) {
    const certs = form.getFieldValue("certifications");
    form.setFieldValue(
      "certifications",
      certs.map((c: EmployeeCertificationFormField) =>
        c.id === certificationId ? { ...c, [field]: value } : c,
      ),
    );
  }

  function handleInputFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";

    if (e.target === avatarInputRef.current) {
      restoreFocusAfterPicker();
      if (file) handleAvatarFileChange(file);
      return;
    }

  }

  return {
    sheetContentRef,
    avatarInputRef,
    formValues,
    errors,
    usernameStatus,
    employeeCodeStatus,
    avatarUrl,
    isEditMode,
    isSubmitting,
    isCreating,
    isUploading,
    isAvatarUploading,
    isPending,
    isSaveDisabled,
    isCancelDisabled,
    uploadingDocumentIds: new Set(
      [...fieldUploadKeys]
        .filter((key) => key.startsWith("document:"))
        .map((key) => key.slice("document:".length)),
    ),
    uploadingCertificationIds: new Set(
      [...fieldUploadKeys]
        .filter((key) => key.startsWith("certification:"))
        .map((key) => key.slice("certification:".length)),
    ),
    departmentOptions,
    positionOptions,
    handleSave,
    handleFieldChange,
    handleAvatarFileChange,
    handleAvatarRemove,
    handleDocumentCheckedChange,
    handleDocumentFileChange,
    triggerAvatarPicker,
    handleAddCertification,
    handleRemoveCertification,
    handleCertificationChange,
    handleCertificationEvidenceChange,
    handleInputFileChange,
  };
}
