import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class OnboardingChecklistItemInputDto {
  @ApiProperty({ description: "Snapshot from template item" })
  @IsString()
  title!: string;

  @ApiProperty()
  @IsInt()
  dueDaysOffset!: number;

  @ApiProperty()
  @IsBoolean()
  mandatory!: boolean;
}

export class CreateOnboardingProcessDto {
  @ApiProperty({ description: "Employee to onboard" })
  @IsUUID("4")
  employeeId!: string;

  @ApiProperty({ description: "Onboarding template to use" })
  @IsUUID("4")
  templateId!: string;

  @ApiPropertyOptional({
    description: "Override join date (defaults to employee.startDate)",
  })
  @IsOptional()
  @IsDateString()
  joinDate?: string;
}
