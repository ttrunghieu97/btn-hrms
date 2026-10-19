import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === "" ? undefined : value;

const requiredNumberTransform = ({ value }: { value: unknown }) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
};

export class CreateClaimDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class AddItemDto {
  @ApiProperty()
  @IsUUID()
  claimId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty()
  @Transform(requiredNumberTransform)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  receiptRequired?: boolean;
}

export class RejectClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ClaimItemResponseDto {
  id!: string;
  claimId!: string;
  description!: string;
  amount!: string;
  expenseDate!: string;
  categoryId?: string | null;
}

export class ClaimResponseDto {
  id!: string;
  employeeId!: string;
  title!: string;
  status!: string;
  totalAmount!: string;
  currency!: string;
  description?: string | null;
  createdAt?: string;
  items?: ClaimItemResponseDto[];
}
