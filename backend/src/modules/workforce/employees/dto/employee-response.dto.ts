import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

class EmployeeDepartmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

class EmployeePositionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty()
  isActive: boolean;
}

export class JobAssignmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: () => EmployeePositionDto })
  position: EmployeePositionDto;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ type: String, nullable: true })
  endDate: string | null;

  @ApiProperty()
  isPrimary: boolean;
}

export class EmployeeAttachmentDto {
  @ApiProperty()
  attachmentId: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: String, nullable: true })
  key: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  mimeType?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  sizeBytes?: number | null;
}

class EmployeeCertificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  issuedBy: string;

  @ApiProperty()
  issuedDate: string;

  @ApiProperty({ type: String, nullable: true })
  expiredDate: string | null;

  @ApiPropertyOptional({ type: EmployeeAttachmentDto, nullable: true })
  attachment?: EmployeeAttachmentDto | null;
}

class EmployeeDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentType: string;

  @ApiPropertyOptional({ type: EmployeeAttachmentDto, nullable: true })
  attachment?: EmployeeAttachmentDto | null;

  @ApiProperty()
  createdAt: Date;
}

export class EmployeeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: String, nullable: true })
  employeeCode: string | null;

  @ApiPropertyOptional({ type: EmployeeAttachmentDto, nullable: true })
  avatar?: EmployeeAttachmentDto | null;

  @ApiProperty({ type: String, nullable: true })
  dob: string | null;

  @ApiProperty({ type: String, nullable: true })
  gender: string | null;

  @ApiProperty({ type: String, nullable: true })
  address: string | null;

  @ApiProperty({ type: String, nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional({ type: EmployeePositionDto, nullable: true })
  position?: EmployeePositionDto | null;

  @ApiProperty({ type: String, nullable: true })
  startDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  endDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastWorkingDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  status: string | null;

  @ApiProperty({ type: String, nullable: true })
  contractType: string | null;

  @ApiProperty({ type: String, nullable: true })
  contractStatus: string | null;

  @ApiProperty({ type: String, nullable: true })
  contractEffectiveFrom: string | null;

  @ApiProperty({ type: String, nullable: true })
  contractEffectiveTo: string | null;

  @ApiProperty({ type: [String] })
  allowedTransitions: string[];

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  identityNumber: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  identityDate: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  identityPlace: string | null;

  @ApiProperty({ type: EmployeeDepartmentDto, nullable: true })
  department: EmployeeDepartmentDto | null;

  @ApiPropertyOptional({ type: [EmployeeCertificationDto] })
  certifications?: EmployeeCertificationDto[];

  @ApiPropertyOptional({ type: [EmployeeDocumentDto] })
  documents?: EmployeeDocumentDto[];

  @ApiPropertyOptional({ type: [JobAssignmentDto] })
  jobAssignments?: JobAssignmentDto[];

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  emergencyContactName: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  emergencyContactPhone: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  bankAccountNumber: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  bankName: string | null;

  @ApiProperty({ type: String, nullable: true, description: "Sensitive; null unless permitted" })
  taxCode: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  deletedAt?: Date | null;
}

export class EmployeeUsernameCheckDto {
  @ApiProperty()
  exists: boolean;
}

export class EmployeeListEnvelopeDto {
  @ApiProperty({ type: [EmployeeResponseDto] })
  data: EmployeeResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class EmployeeEnvelopeDto {
  @ApiProperty({ type: EmployeeResponseDto })
  data: EmployeeResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class EmployeeUsernameCheckEnvelopeDto {
  @ApiProperty({ type: EmployeeUsernameCheckDto })
  data: EmployeeUsernameCheckDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class UploadTempFileDto {
  @ApiProperty()
  tempFileToken: string;

  @ApiProperty()
  tempFileId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;
}

export class UploadTempFileEnvelopeDto {
  @ApiProperty({ type: UploadTempFileDto })
  data: UploadTempFileDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

