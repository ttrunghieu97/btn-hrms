import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class PayslipQueryDto extends PagedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payrollRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}



