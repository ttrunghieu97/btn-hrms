import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ArrayMinSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateConversationDto {
  @ApiProperty({ enum: ["direct", "group"] })
  @IsEnum(["direct", "group"])
  type: "direct" | "group";

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  participantUserIds: string[];
}



