import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class PayrollRunQueryDto extends PagedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payrollPeriodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}



