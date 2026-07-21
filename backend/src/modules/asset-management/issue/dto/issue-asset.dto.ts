import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class IssueAssetLineDto {
  @ApiPropertyOptional({
    description:
      "Serialized asset id. Provide for tracked units; omit for quantity-only stock lines.",
  })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty()
  @IsUUID()
  assetTypeId!: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class IssueAssetDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiPropertyOptional({
    description: "Originating approved request. Omit for a direct management issue.",
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ type: [IssueAssetLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IssueAssetLineDto)
  lines!: IssueAssetLineDto[];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    description: "Temp file token for an optional signed handover document.",
  })
  @IsOptional()
  @IsString()
  handoverFileToken?: string;
}
