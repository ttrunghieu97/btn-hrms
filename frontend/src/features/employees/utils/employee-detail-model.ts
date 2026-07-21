import type { EmployeeResponseDto } from '@/api/generated/model';
import {
  getTextString,
  formatAddress,
  toDateInputValue,
  toAssetUrl,
  getFileName,
} from './employee-display';
import {
  COMPANY_DOCUMENT_OPTIONS,
} from './employee-form-model';

export interface EditFormValues {
  avatar: {
    status: 'empty' | 'existing' | 'removing';
    attachmentId?: string;
    previewUrl?: string;
    file?: File;
    tempFileToken?: string;
  };
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
  documents: DocumentField[];
  certifications: CertificationField[];
}

export interface DocumentField {
  id: string;
  documentType: string;
  label: string;
  checked: boolean;
  url: string;
  fileName: string;
  status: 'empty' | 'existing' | 'removing';
  attachmentId?: string;
  previewUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  file?: File;
  tempFileToken?: string;
  error?: string;
}

export interface CertificationField {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiredDate: string;
  status: 'empty' | 'existing' | 'removing';
  attachmentId?: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  file?: File;
  tempFileToken?: string;
  error?: string;
  previewUrl?: string;
}

function getDocumentUrl(document: any) {
  if (!document || typeof document !== 'object') return '';
  const legacyUrl = document.url;
  if (typeof legacyUrl === 'string' && legacyUrl.trim()) return legacyUrl;
  const att = document.attachment;
  if (!att || typeof att !== 'object') return '';
  const id = att.attachmentId;
  return id ? toAssetUrl(id) : '';
}

export function createDocumentFields(employee: EmployeeResponseDto | null): DocumentField[] {
  const docsByType = new Map(
    (employee?.documents ?? []).map((document) => {
      return [document.documentType, document] as const;
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
      url,
      fileName: url ? getFileName(url) : '',
      status: matched ? 'existing' : 'empty',
      attachmentId: matched?.attachment?.attachmentId,
      previewUrl: url,
      mimeType: matched?.attachment?.mimeType ?? undefined,
      sizeBytes: matched?.attachment?.sizeBytes ?? undefined,
    };
  });
}

export function createCertificationFields(employee: EmployeeResponseDto | null): CertificationField[] {
  return (employee?.certifications ?? []).map((certification) => {
    const fileUrl = certification.attachment?.attachmentId
      ? toAssetUrl(certification.attachment.attachmentId)
      : '';
    return {
      id: certification.id,
      name: certification.name ?? '',
      issuedBy: certification.issuedBy ?? '',
      issuedDate: toDateInputValue(certification.issuedDate),
      expiredDate: toDateInputValue(certification.expiredDate),
      status: fileUrl ? 'existing' : 'empty',
      attachmentId: certification.attachment?.attachmentId,
      fileUrl,
      fileName: fileUrl ? getFileName(fileUrl) : '',
      mimeType: certification.attachment?.mimeType ?? undefined,
      sizeBytes: certification.attachment?.sizeBytes ?? undefined,
    };
  });
}

export function createFormValues(employee: EmployeeResponseDto | null): EditFormValues {
  const avatar = employee?.avatar;

  return {
    avatar: avatar
      ? { status: 'existing' as const, attachmentId: avatar.attachmentId, previewUrl: avatar.url }
      : { status: 'empty' as const },
    username: employee?.username ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    employeeCode: employee?.employeeCode ?? '',
    email: employee?.email ?? '',
    phoneNumber: employee?.phoneNumber ?? '',
    address:
      typeof employee?.address === 'string'
        ? employee.address
        : formatAddress(employee?.address, ''),
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

export function buildEmployeePayload(formValues: EditFormValues): any {
  return {
    username: formValues.username || undefined,
    firstName: formValues.firstName || undefined,
    lastName: formValues.lastName || undefined,
    employeeCode: formValues.employeeCode || undefined,
    email: formValues.email || undefined,
    phoneNumber: formValues.phoneNumber || undefined,
    address: formValues.address || undefined,
    dob: formValues.dob || undefined,
    gender: formValues.gender || undefined,
    departmentId: formValues.departmentId || undefined,
    positionId: formValues.positionId || undefined,
    startDate: formValues.startDate || undefined,
    endDate: formValues.endDate || undefined,
    status: formValues.status || undefined,
    identityNumber: formValues.identityNumber || undefined,
    identityDate: formValues.identityDate || undefined,
    identityPlace: formValues.identityPlace || undefined,
    avatar: formValues.avatar.tempFileToken
      ? { mode: 'replace' as const, tempFileToken: formValues.avatar.tempFileToken }
      : formValues.avatar.status === 'existing'
        ? { mode: 'keep' as const, attachmentId: formValues.avatar.attachmentId! }
        : formValues.avatar.status === 'removing'
          ? { mode: 'remove' as const, attachmentId: formValues.avatar.attachmentId! }
          : undefined,
    documents: formValues.documents.reduce<any[]>((items, doc) => {
      if (!doc.checked && doc.status === 'empty') return items;
      if (doc.checked && doc.tempFileToken) {
        items.push({ documentType: doc.documentType, mode: 'replace' as const, tempFileToken: doc.tempFileToken });
        return items;
      }
      const mode = doc.checked ? ('keep' as const) : ('remove' as const);
      if (!doc.attachmentId && mode === 'keep') return items;
      items.push({ documentType: doc.documentType, mode, ...(doc.attachmentId ? { attachmentId: doc.attachmentId } : {}) });
      return items;
    }, []),
    certifications: formValues.certifications.reduce<any[]>((items, cert) => {
      if (cert.status === 'empty' && !cert.name.trim() && !cert.issuedBy.trim()) return items;
      if (cert.tempFileToken) {
        items.push({
          id: cert.id.startsWith('local-') ? undefined : cert.id,
          name: cert.name,
          issuedBy: cert.issuedBy,
          issuedDate: cert.issuedDate || undefined,
          expiredDate: cert.expiredDate || undefined,
          attachment: { mode: 'replace' as const, tempFileToken: cert.tempFileToken },
        });
        return items;
      }
      const mode = cert.status === 'removing' ? ('remove' as const) : ('keep' as const);
      items.push({
        id: cert.id.startsWith('local-') ? undefined : cert.id,
        name: cert.name,
        issuedBy: cert.issuedBy,
        issuedDate: cert.issuedDate || undefined,
        expiredDate: cert.expiredDate || undefined,
        attachment: cert.attachmentId ? { mode, attachmentId: cert.attachmentId } : undefined,
      });
      return items;
    }, []),
  };
}
