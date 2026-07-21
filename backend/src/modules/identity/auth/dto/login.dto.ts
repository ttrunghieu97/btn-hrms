import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginRequestDto {
  @ApiProperty({ example: "admin", description: "Username or Email" })
  @IsString({ message: "Username must be a string" })
  @IsNotEmpty({ message: "Username is required" })
  username!: string;

  @ApiProperty({ example: "password123", description: "User password" })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password!: string;
}
