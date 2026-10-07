import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

  @ApiPropertyOptional({ example: "123456", description: "6-digit TOTP MFA passcode if 2FA is enabled" })
  @IsOptional()
  @IsString({ message: "TOTP passcode must be a string" })
  @Matches(/^\d{6}$/, { message: "TOTP passcode must be 6 digits" })
  totpCode?: string;
}
