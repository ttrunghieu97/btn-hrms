import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsIn,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  IsDateString,
} from "class-validator";
import { plainToInstance, Transform, Type } from "class-transformer";
import { IsOptionalDateString } from "../../../../shared/decorators/optional-date-string.decorator";

export const EMPLOYEE_COMMAND_STATUSES = [
  "working",
  "probation",
  "terminated",
] as const;
export type EmployeeCommandStatus = (typeof EMPLOYEE_COMMAND_STATUSES)[number];

export const CONTRACT_TYPE_VALUES = [
  "permanent",
  "fixed_term",
  "probationary",
  "internship",
  "service",
  "part_time",
] as const;

export const EMPLOYEE_GENDERS = ["male", "female", "other", "unknown"] as const;
export type EmployeeGender = (typeof EMPLOYEE_GENDERS)[number];

@ValidatorConstraint({ name: "attachmentIntentSemantics", async: false })
class AttachmentIntentSemanticsConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const value = args.object as AttachmentIntentDto;

    if (value.mode === "keep") {
      return Boolean(value.attachmentId);
    }

    if (value.mode === "remove") {
      return true;
    }

    if (value.mode === "replace") {
      return Boolean(value.tempFileToken);
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const value = args.object as AttachmentIntentDto;

    if (value.mode === "keep") {
      return "keep mode requires attachmentId";
    }

    if (value.mode === "remove") {
      return "remove mode is valid";
    }

    if (value.mode === "replace") {
      return "replace mode requires tempFileToken";
    }

    return "invalid attachment intent";
  }
}

export class AttachmentIntentDto {
  @IsIn(["keep", "remove", "replace"])
  @Validate(AttachmentIntentSemanticsConstraint)
  mode!: "keep" | "remove" | "replace";

  @IsOptional()
  @IsString()
  attachmentId?: string;

  @IsOptional()
  @IsString()
  tempFileToken?: string;
}

export class EmployeeDocumentIntentDto extends AttachmentIntentDto {
  @IsString()
  @IsNotEmpty()
  documentType!: string;
}

export class EmployeeCertificationIntentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  issuedBy!: string;

  @IsDateString()
  issuedDate!: string;

  @IsOptionalDateString()
  expiredDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentIntentDto)
  evidence?: AttachmentIntentDto;
}

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsOptional()
  @Transform(({ value }) => parseAttachmentIntent(value))
  @ValidateNested()
  @Type(() => AttachmentIntentDto)
  avatar?: AttachmentIntentDto;

  @IsOptionalDateString()
  dob?: string;

  @IsString()
  @IsOptional()
  @IsIn(EMPLOYEE_GENDERS)
  gender?: EmployeeGender;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsOptionalDateString()
  startDate?: string;

  @IsOptionalDateString()
  endDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(EMPLOYEE_COMMAND_STATUSES)
  status?: EmployeeCommandStatus;

  @IsString()
  @IsOptional()
  @IsIn(CONTRACT_TYPE_VALUES)
  contractType?: (typeof CONTRACT_TYPE_VALUES)[number];

  @IsString()
  @IsOptional()
  identityNumber?: string;

  @IsOptionalDateString()
  identityDate?: string;

  @IsString()
  @IsOptional()
  identityPlace?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  taxCode?: string;

  @IsArray()
  @Transform(({ value }) => parseCertificationIntents(value))
  @ValidateNested({ each: true })
  @Type(() => EmployeeCertificationIntentDto)
  @IsOptional()
  certifications?: EmployeeCertificationIntentDto[];

  @IsArray()
  @Transform(({ value }) => parseDocumentIntents(value))
  @ValidateNested({ each: true })
  @Type(() => EmployeeDocumentIntentDto)
  @IsOptional()
  documents?: EmployeeDocumentIntentDto[];

  @IsOptional()
  @IsString()
  identityCard?: string;
}

function parseJsonTransportValue(value: any  ): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return undefined;
  return JSON.parse(trimmed)  ;
}

function parseAttachmentIntent(value: any  ): unknown {
  const parsed = parseJsonTransportValue(value);
  return parsed == null ? parsed : plainToInstance(AttachmentIntentDto, parsed);
}

function parseDocumentIntents(value: any  ): unknown {
  const parsed = parseJsonTransportValue(value);
  return Array.isArray(parsed)
    ? parsed.map((item) => plainToInstance(EmployeeDocumentIntentDto, item))
    : parsed;
}

function parseCertificationIntents(value: any  ): unknown {
  const parsed = parseJsonTransportValue(value);
  return Array.isArray(parsed)
    ? parsed.map((item) => plainToInstance(EmployeeCertificationIntentDto, item))
    : parsed;
}



