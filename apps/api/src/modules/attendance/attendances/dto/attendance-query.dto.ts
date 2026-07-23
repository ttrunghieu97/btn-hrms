import { IsOptional, IsDateString, IsString, Matches } from "class-validator";
import { SortableQueryDto } from "../../../../shared/dto/pagination.dto";

export class AttendanceQueryDto extends SortableQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
