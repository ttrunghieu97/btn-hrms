import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class UploadTempFileBodyDto {
  @ApiProperty({ enum: ["avatar", "document", "certification"] })
  @IsIn(["avatar", "document", "certification"])
  purpose!: "avatar" | "document" | "certification";

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  draftId!: string;
}

export class UploadTempFileResponseDto {
  @ApiProperty()
  tempFileToken!: string;

  @ApiProperty()
  tempFileId!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;
}
