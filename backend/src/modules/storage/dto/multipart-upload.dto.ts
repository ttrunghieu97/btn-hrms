import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const ALLOWED_PURPOSES = ["avatar", "document", "attachment", "certification"] as const;
const ALLOWED_OWNER_TYPES = ["employee", "task", "user"] as const;

export class MultipartInitBodyDto {
  @ApiProperty({ enum: ALLOWED_PURPOSES })
  @IsIn(ALLOWED_PURPOSES)
  purpose!: (typeof ALLOWED_PURPOSES)[number];

  @ApiProperty({ enum: ALLOWED_OWNER_TYPES })
  @IsIn(ALLOWED_OWNER_TYPES)
  ownerType!: (typeof ALLOWED_OWNER_TYPES)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(500 * 1024 * 1024)
  size!: number;
}

class PresignedPartDto {
  @ApiProperty()
  partNumber!: number;

  @ApiProperty()
  url!: string;
}

export class MultipartInitResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  uploadId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty({ type: [PresignedPartDto] })
  parts!: PresignedPartDto[];

  @ApiProperty()
  partSize!: number;

  @ApiProperty()
  expiresIn!: number;
}

export class CompletedPartDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  partNumber!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  etag!: string;
}

export class MultipartCompleteBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  uploadId!: string;

  @ApiProperty({ type: [CompletedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts!: CompletedPartDto[];
}

export class MultipartCompleteResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  status!: string;
}
