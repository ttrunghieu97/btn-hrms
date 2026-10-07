import type {
  EmployeeCertificationDto,
  EmployeeDocumentDto,
  EmployeeResponseDto,
} from '@/api/generated/model';
import { employeeUiCopy } from '@/lib/app-copy';
import { extractProtectedAssetUrl } from '@/lib/asset-url';
import { getRequestId } from '@/lib/request-id';
import type {} from '../types/employee-attachment-payload';
import type { UpdateEmployeePayload } from '../queries/employee-queries';

export const DEFAULT_EMPLOYEE_PASSWORD = 'BtnHrms2025!@#';

export const GENDER_OPTIONS = employeeUiCopy.options.genders;

export const STATUS_OPTIONS = employeeUiCopy.options.statuses;

export const COMPANY_DOCUMENT_OPTIONS = employeeUiCopy.options.documents;

export interface EmployeeDocumentFormField {
  id: string;
  documentType: string;
  label: string;
  checked: boolean;
  /** New file picked by user (uploaded during submit) */
  file?: File;
  tempFileToken?: string;
  /** Existing attachment ID (edit mode) */
  attachmentId?: string;
  /** Existing attachment URL for preview */
  existingUrl?: string;
  /** Filename for display */
  fileName?: string;
}

export interface EmployeeCertificationFormField {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate: string;
  /** New evidence file (uploaded during submit) */
  evidenceFile?: File;
  evidenceTempFileToken?: string;
  /** Existing evidence attachment ID */
  evidenceAttachmentId?: string;
  /** Existing evidence URL for preview */
  evidenceUrl?: string;
  /** Filename for display */
  evidenceFileName?: string;
}

export interface EmployeeFormValues {
  /** Avatar: new file */
  avatarFile?: File;
  avatarTempFileToken?: string;
  avatarRemoved?: boolean;
  /** Avatar: existing attachment ID (edit mode) */
  avatarAttachmentId?: string;
  /** Avatar: existing URL for preview (edit mode) */
  avatarExistingUrl?: string;
  /** Avatar: local preview URL (ObjectURL for newly picked file) */
  avatarPreview?: string;
  username: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phoneNumber: string;
  address: string;
  dob: string;
  gender: string;
  status: string;
  departmentId: string;
  positionId: string;
  startDate: string;
  endDate: string;
  identityNumber: string;
  identityDate: string;
  identityPlace: string;
  documents: EmployeeDocumentFormField[];
  certifications: EmployeeCertificationFormField[];
}

export function createLocalId(prefix: string) {
  return `${prefix}-${getRequestId()}`;
}

export function getFileName(value: string) {
  if (!value.trim()) return '';
  const source = value.split('?')[0];
  const parts = source.split('/');
  return decodeURIComponent(parts[parts.length - 1] ?? '');
}

export function createEmptyCertification(): EmployeeCertificationFormField {
  return {
    id: createLocalId('cert'),
    name: '',
    issuedBy: '',
    issuedDate: '',
    expiredDate: '',
  };
}

export function createEmptyEmployeeFormValues(): EmployeeFormValues {
  return {
    username: '',
    firstName: '',
    lastName: '',
    employeeCode: '',
    email: '',
    phoneNumber: '',
    address: '',
    dob: '',
    gender: '',
    status: 'working',
    departmentId: '',
    positionId: '',
    startDate: '',
    endDate: '',
    identityNumber: '',
    identityDate: '',
    identityPlace: '',
    documents: COMPANY_DOCUMENT_OPTIONS.map((option) => ({
      id: option.id,
      documentType: option.id,
      label: option.label,
      checked: false,
      fileName: '',
    })),
    certifications: [],
  };
}

export function sanitizeVietnameseString(value: string) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

export function buildUsernameFromName(firstName: string, lastName: string) {
  const first = sanitizeVietnameseString(firstName).replace(/\s+/g, '');
  const initials = sanitizeVietnameseString(lastName)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
  return `${first}${initials}`;
}

export function getTextString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    const candidate = Object.values(value).find(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (candidate) return candidate;
  }

  return fallback;
}

export function toDateInputValue(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const matched = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (matched) return matched[0];

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatAddress(value: unknown, fallback = 'N/A') {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (!value || typeof value !== 'object') return fallback;

  const parts = Object.values(value).filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(', ') : fallback;
}

function getDocumentTypeLabel(value: unknown) {
  if (typeof value !== 'string') return '';
  const matched = COMPANY_DOCUMENT_OPTIONS.find((option) => option.id === value);
  return matched?.label ?? value;
}

function getDocumentUrl(document: unknown) {
  if (!document || typeof document !== 'object') return '';

  const legacyUrl = (document as { url?: unknown }).url;
  if (typeof legacyUrl === 'string' && legacyUrl.trim()) return legacyUrl;

  return extractProtectedAssetUrl((document as { attachment?: unknown }).attachment) ?? '';
}

export function getDocumentLabel(document: unknown) {
  if (!document || typeof document !== 'object') return '';

  const legacyName = (document as { name?: unknown }).name;
  if (typeof legacyName === 'string' && legacyName.trim()) return legacyName;

  return getDocumentTypeLabel((document as { documentType?: unknown }).documentType);
}

function getCertificationUrl(certification: unknown) {
  if (!certification || typeof certification !== 'object') return '';

  const legacyImage = (certification as { image?: unknown }).image;
  if (typeof legacyImage === 'string' && legacyImage.trim()) return legacyImage;

  return extractProtectedAssetUrl((certification as { attachment?: unknown }).attachment) ?? '';
}

export function createDocumentFields(
  employee: EmployeeResponseDto | null,
): EmployeeDocumentFormField[] {
  const docsByType = new Map(
    (employee?.documents ?? []).map((document) => {
      const typedDocument = document as EmployeeDocumentDto & {
        documentType?: string | null;
        attachment?: {
          attachmentId?: string;
          mimeType?: string | null;
          sizeBytes?: number | null;
        } | null;
      };
      return [typedDocument.documentType, typedDocument] as const;
    }),
  );

  return COMPANY_DOCUMENT_OPTIONS.map((option) => {
    const matched = docsByType.get(option.id) ?? docsByType.get(option.label);
    const url = matched ? getDocumentUrl(matched) : '';
    return {
      id: option.id,
      documentType: option.id,
      label: option.label,
      checked: Boolean(matched),
      existingUrl: url || undefined,
      fileName: url ? getFileName(url) : '',
      attachmentId: matched?.attachment?.attachmentId || undefined,
    };
  });
}

export function createCertificationFields(
  employee: EmployeeResponseDto | null,
): EmployeeCertificationFormField[] {
  return (employee?.certifications ?? []).map((certification) => {
    const typedCertification = certification as EmployeeCertificationDto & {
      attachment?: {
        attachmentId?: string;
        mimeType?: string | null;
        sizeBytes?: number | null;
      } | null;
    };
    const fileUrl = getCertificationUrl(typedCertification);

    return {
      id: typedCertification.id,
      name: typedCertification.name ?? '',
      issuedBy: typedCertification.issuedBy ?? '',
      issuedDate: toDateInputValue(typedCertification.issuedDate),
      expiredDate: toDateInputValue(typedCertification.expiredDate),
      evidenceAttachmentId: typedCertification.attachment?.attachmentId || undefined,
      evidenceUrl: fileUrl || undefined,
      evidenceFileName: fileUrl ? getFileName(fileUrl) : undefined,
    };
  });
}

export function createEmployeeFormValues(
  employee: EmployeeResponseDto | null,
): EmployeeFormValues {
  const avatar = employee?.avatar as
    | {
        attachmentId: string;
        url: string;
        mimeType?: string | null;
        sizeBytes?: number | null;
      }
    | null
    | undefined;

  return {
    ...createEmptyEmployeeFormValues(),
    ...(avatar
      ? {
          avatarAttachmentId: avatar.attachmentId,
          avatarExistingUrl: avatar.url,
        }
      : {}),
    username: employee?.username ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    employeeCode: employee?.employeeCode ?? '',
    email: employee?.email ?? '',
    phoneNumber: employee?.phoneNumber ?? '',
    address:
      typeof employee?.address === 'string' ? employee.address : formatAddress(employee?.address, ''),
    dob: toDateInputValue(employee?.dob),
    gender: getTextString(employee?.gender),
    status: getTextString(employee?.status, 'working'),
    departmentId: employee?.department?.id ?? '',
    positionId: employee?.position?.id ?? '',
    startDate: toDateInputValue(employee?.startDate),
    endDate: toDateInputValue(employee?.endDate),
    identityNumber: employee?.identityNumber ?? '',
    identityDate: toDateInputValue(employee?.identityDate),
    identityPlace: employee?.identityPlace?.trim() || '',
    documents: createDocumentFields(employee),
    certifications: createCertificationFields(employee),
  };
}

export interface EmployeeAttachmentBuildInput {
  avatarFile?: File;
  avatarAttachmentId?: string;
  documents: EmployeeDocumentFormField[];
  certifications: EmployeeCertificationFormField[];
}

/**
 * Build the raw text payload (without attachment intents).
 * Used to assemble the initial payload before file uploads.
 */
export function buildEmployeeTextPayload(
  formValues: EmployeeFormValues,
  options: { includeUsername?: boolean } = {},
): Record<string, unknown> {
  return {
    ...(options.includeUsername ? { username: formValues.username?.trim() || undefined } : {}),
    firstName: formValues.firstName.trim(),
    lastName: formValues.lastName.trim(),
    employeeCode: formValues.employeeCode.trim() || undefined,
    email: formValues.email.trim() || undefined,
    phoneNumber: formValues.phoneNumber.trim() || undefined,
    address: formValues.address.trim() || undefined,
    dob: formValues.dob || undefined,
    gender: formValues.gender || undefined,
    status: formValues.status || undefined,
    departmentId: formValues.departmentId,
    positionId: formValues.positionId,
    startDate: formValues.startDate || undefined,
    endDate: formValues.endDate || undefined,
    identityNumber: formValues.identityNumber.trim() || undefined,
    identityDate: formValues.identityDate || undefined,
    identityPlace: formValues.identityPlace.trim() || undefined,
  };
}
