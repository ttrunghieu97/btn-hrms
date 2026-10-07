import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsOptional,
  IsUUID,
} from "class-validator";

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
