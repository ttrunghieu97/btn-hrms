import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RejectTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
