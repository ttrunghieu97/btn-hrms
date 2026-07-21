import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CheckEmployeeCodeDto {
  @ApiProperty({
    description: "Employee code to check",
    example: "NV001",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeCode: string;
}

