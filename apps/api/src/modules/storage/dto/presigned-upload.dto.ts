import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

const ALLOWED_PURPOSES = ["avatar", "document", "attachment", "certification"] as const;
const ALLOWED_OWNER_TYPES = ["employee", "task", "user"] as const;

export class PresignedUploadBodyDto {
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
  @IsNumber()
  @Min(1)
  @Max(500 * 1024 * 1024) // 500MB max
  size!: number;
}

export class PresignedUploadResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty()
  key!: string;
}

export class ConfirmPresignedUploadBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileId!: string;
}

export class ConfirmPresignedUploadResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  status!: string;
}
