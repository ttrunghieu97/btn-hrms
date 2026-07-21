import { formatDateISO } from "@/shared/utils/date-format";
import { type CreateEmployeeDto } from "../dto/create-employee.dto";
import { type EmployeeResponseDto } from "../dto/employee-response.dto";
import { type UpdateEmployeeDto } from "../dto/update-employee.dto";
import { getAllowedTransitions } from "../constants/employee-transitions";

interface ResolvedPosition {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface EmployeeMapperOptions {
  sensitiveFieldsAllowed?: boolean;
  listView?: boolean;
}

const LIST_REDACTED_FIELDS = [
  "identityNumber",
  "identityDate",
  "identityPlace",
  "emergencyContactName",
  "emergencyContactPhone",
  "bankAccountNumber",
  "bankName",
  "taxCode",
] as const;

interface AttachmentFileRow {
  id: string;
  key: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

interface EmployeeRow {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  avatar?: string | null;
  avatarFile?: AttachmentFileRow | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  lastWorkingDate?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  identityNumber?: string | null;
  identityDate?: string | null;
  identityPlace?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  taxCode?: string | null;
  user?: { id: string; username: string; email?: string | null } | null;
  employmentRecords?: {
    id: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
  }[];
  contracts?: {
    id: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    status?: string | null;
    contractType?: string | null;
    isCurrent?: boolean;
  }[];
  orgAssignments?: {
    id: string;
    jobTitle?: string | null;
    department?: { id: string; name: string } | null;
    isCurrent?: boolean;
  }[];
  jobAssignments?: {
    id: string;
    startDate: Date | string;
    endDate?: Date | string | null;
    isPrimary?: boolean | null;
    position?: {
      id: string;
      name: string;
      description?: string | null;
      isActive: boolean;
    } | null;
  }[];
  siteAssignments?: {
    id: string;
    isActive: boolean;
    location?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  certifications?: {
    id: string;
    name: string;
    issuedBy: string;
    issuedDate: Date | string;
    expiredDate?: Date | string | null;
    image?: string | null;
    attachmentId?: string | null;
    file?: AttachmentFileRow | null;
  }[];
  documents?: {
    id: string;
    attachmentId: string;
    documentType: string;
    createdAt: Date | string;
    isActive: boolean;
    file?: AttachmentFileRow | null;
  }[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class EmployeeMapper {
  private static toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private static toDateString(value: Date | string, timezone?: string): string {
    if (value instanceof Date) {
      const tz = timezone ?? process.env.APP_TIMEZONE ?? "Asia/Ho_Chi_Minh";
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(value);
    }
    return value;
  }

  private static toAttachment(file?: AttachmentFileRow | null) {
    if (!file) return null;

    return {
      attachmentId: file.id,
      url: `/files/${file.key}`,
      key: file.key,
      mimeType: file.mimeType ?? null,
      sizeBytes: file.sizeBytes ?? null,
    };
  }

  /**
   * Transforms a raw database employee (with relations) into a clean Response DTO.
   */
  static toResponseDto(row: EmployeeRow): EmployeeResponseDto {
    return this.toResponseDtoWithPosition(row);
  }

  static toResponseDtoWithPosition(
    row: EmployeeRow,
    resolvedPosition?: ResolvedPosition | null,
    options: EmployeeMapperOptions | boolean = {},
  ): EmployeeResponseDto {
    const mapperOptions =
      typeof options === "boolean"
        ? { sensitiveFieldsAllowed: options }
        : options;
    const sensitiveFieldsAllowed = mapperOptions.sensitiveFieldsAllowed ?? false;
    const redactListSensitiveFields = mapperOptions.listView === true;
    const currentAssignment =
      row.orgAssignments?.find((item) => item.isCurrent) ??
      row.orgAssignments?.[0];
    const currentContract =
      row.contracts?.find((item) => item.isCurrent) ?? row.contracts?.[0];

    const avatarAttachment = this.toAttachment(row.avatarFile);
    const redactListField = (field: (typeof LIST_REDACTED_FIELDS)[number]) =>
      redactListSensitiveFields && LIST_REDACTED_FIELDS.includes(field);

    return {
      id: row.id,
      // Username now strictly comes from the User identity table
      username: row.user?.username || "",
      email: row.email || row.user?.email || "",

      firstName: row.firstName,
      lastName: row.lastName,
      employeeCode: row.employeeCode ?? null,
      avatar: avatarAttachment,
      dob: row.dob ?? null,
      gender: row.gender ?? null,
      address: row.address ?? null,
      phoneNumber: row.phoneNumber ?? null,

      position: resolvedPosition
        ? {
            id: resolvedPosition.id,
            name: resolvedPosition.name,
            description: resolvedPosition.description ?? null,
            isActive: resolvedPosition.isActive
          }
        : currentAssignment?.jobTitle
          ? {
              id: '',
              name: currentAssignment.jobTitle,
              description: null,
              isActive: false
            }
          : null,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      lastWorkingDate: row.lastWorkingDate ?? null,
      status: row.status ?? null,
      contractType: currentContract?.contractType ?? null,
      contractStatus: currentContract?.status ?? null,
      contractEffectiveFrom: currentContract?.effectiveFrom ?? null,
      contractEffectiveTo: currentContract?.effectiveTo ?? null,
      allowedTransitions: getAllowedTransitions(
        row.status ?? "",
      ),

      identityNumber:
        sensitiveFieldsAllowed && !redactListField("identityNumber")
          ? (row.identityNumber ?? null)
          : null,
      identityDate:
        sensitiveFieldsAllowed && !redactListField("identityDate")
          ? (row.identityDate ?? null)
          : null,
      identityPlace:
        sensitiveFieldsAllowed && !redactListField("identityPlace")
          ? (row.identityPlace ?? null)
          : null,

      emergencyContactName:
        sensitiveFieldsAllowed && !redactListField("emergencyContactName")
          ? (row.emergencyContactName ?? null)
          : null,
      emergencyContactPhone:
        sensitiveFieldsAllowed && !redactListField("emergencyContactPhone")
          ? (row.emergencyContactPhone ?? null)
          : null,
      bankAccountNumber:
        sensitiveFieldsAllowed && !redactListField("bankAccountNumber")
          ? (row.bankAccountNumber ?? null)
          : null,
      bankName:
        sensitiveFieldsAllowed && !redactListField("bankName")
          ? (row.bankName ?? null)
          : null,
      taxCode:
        sensitiveFieldsAllowed && !redactListField("taxCode")
          ? (row.taxCode ?? null)
          : null,

      department: currentAssignment?.department
        ? {
            id: currentAssignment.department.id,
            name: currentAssignment.department.name,
          }
        : null,
      certifications: row.certifications
        ? row.certifications.map((cert) => ({
            id: cert.id,
            name: cert.name,
            issuedBy: cert.issuedBy,
            issuedDate: this.toDateString(cert.issuedDate),
            expiredDate: cert.expiredDate
              ? this.toDateString(cert.expiredDate)
              : null,
            attachment: this.toAttachment(cert.file),
          }))
        : [],
      documents: row.documents
        ? row.documents
            .filter((doc) => doc.isActive)
            .map((doc) => ({
              id: doc.id,
              documentType: doc.documentType,
              attachment: this.toAttachment(doc.file),
              createdAt: this.toDate(doc.createdAt),
            }))
        : [],

      jobAssignments: (row.jobAssignments ?? []).map((ja) => ({
        id: ja.id,
        position: {
          id: ja.position?.id ?? '',
          name: ja.position?.name ?? '',
          description: ja.position?.description ?? null,
          isActive: ja.position?.isActive ?? false,
        },
        startDate: this.toDateString(ja.startDate),
        endDate: ja.endDate ? this.toDateString(ja.endDate) : null,
        isPrimary: ja.isPrimary ?? true,
      })),

      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
    };
  }

  /**
   * Optional: Map multiple entities
   */
  static toResponseDtos(
    rows: EmployeeRow[],
    resolvedPositions?: Record<string, ResolvedPosition | null>,
    options: EmployeeMapperOptions | boolean = {},
  ): EmployeeResponseDto[] {
    return rows.map((row) =>
      this.toResponseDtoWithPosition(row, resolvedPositions?.[row.id] ?? null, options),
    );
  }

  static toEntity(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    if (!dto) return {};

    return {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.employeeCode !== undefined
        ? { employeeCode: dto.employeeCode }
        : {}),
      ...(dto.dob !== undefined ? { dob: dto.dob } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.phoneNumber !== undefined
        ? { phoneNumber: dto.phoneNumber }
        : {}),
      ...(dto.identityNumber !== undefined
        ? { identityNumber: dto.identityNumber }
        : {}),
      ...(dto.identityDate !== undefined
        ? { identityDate: dto.identityDate }
        : {}),
      ...(dto.identityPlace !== undefined
        ? { identityPlace: dto.identityPlace }
        : {}),
      ...(dto.emergencyContactName !== undefined
        ? { emergencyContactName: dto.emergencyContactName }
        : {}),
      ...(dto.emergencyContactPhone !== undefined
        ? { emergencyContactPhone: dto.emergencyContactPhone }
        : {}),
      ...(dto.bankAccountNumber !== undefined
        ? { bankAccountNumber: dto.bankAccountNumber }
        : {}),
      ...(dto.bankName !== undefined
        ? { bankName: dto.bankName }
        : {}),
      ...(dto.taxCode !== undefined
        ? { taxCode: dto.taxCode }
        : {}),
    };
  }
}

