import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ExplainAttendanceExceptionDto {
  @ApiProperty({
    type: String,
    description: "Employee explanation for the attendance exception",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note!: string;
}
