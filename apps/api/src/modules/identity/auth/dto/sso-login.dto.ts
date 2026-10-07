import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SsoLoginDto {
  @ApiProperty({ description: "Google ID Token" })
  @IsString({ message: "idToken must be a string" })
  @IsNotEmpty({ message: "idToken is required" })
  idToken!: string;

  @ApiPropertyOptional({ example: "123456", description: "6-digit TOTP MFA passcode if 2FA is enabled" })
  @IsOptional()
  @IsString({ message: "TOTP passcode must be a string" })
  @Matches(/^\d{6}$/, { message: "TOTP passcode must be 6 digits" })
  totpCode?: string;
}
