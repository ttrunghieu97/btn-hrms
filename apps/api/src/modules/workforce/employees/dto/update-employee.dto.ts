import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import {
  AttachmentIntentDto,
  EmployeeCertificationIntentDto,
  EmployeeDocumentIntentDto,
  EMPLOYEE_COMMAND_STATUSES,
  EMPLOYEE_GENDERS,
  type EmployeeCommandStatus,
  type EmployeeGender,
} from "./create-employee.dto";
import { IsOptionalDateString } from "../../../../shared/decorators/optional-date-string.decorator";

export class UpdateEmployeeDto {
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
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsOptional()
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
  @ValidateNested({ each: true })
  @Type(() => EmployeeCertificationIntentDto)
  @IsOptional()
  certifications?: EmployeeCertificationIntentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeDocumentIntentDto)
  @IsOptional()
  documents?: EmployeeDocumentIntentDto[];

  @IsOptional()
  @IsString()
  identityCard?: string;
}

