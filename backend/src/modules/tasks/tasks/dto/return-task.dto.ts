import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ReturnTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
