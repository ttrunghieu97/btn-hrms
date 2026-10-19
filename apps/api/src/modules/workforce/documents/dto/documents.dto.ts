import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { PagedQueryDto } from "../../../../shared/dto/pagination.dto";

export class ListDocumentsQueryDto extends PagedQueryDto {
  @ApiPropertyOptional({ description: "Free-text search (employee name, code, document type)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" || value === true
      ? true
      : value === "false" || value === false
        ? false
        : undefined,
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: "createdAt:desc" })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  fileId!: string;

  @ApiProperty()
  @IsString()
  documentType!: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileId?: string;
}
