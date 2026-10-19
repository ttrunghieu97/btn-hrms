import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EnableTotpRequestDto {
  @ApiProperty({
    example: "JBSWY3DPEHPK3PXP",
    description: "Base32-encoded TOTP secret returned by /totp/setup",
  })
  @IsString({ message: "secret must be a string" })
  @IsNotEmpty({ message: "secret is required" })
  @Matches(/^[A-Z2-7]+=*$/i, { message: "secret must be a valid Base32 string" })
  secret!: string;

  @ApiProperty({
    example: "123456",
    description: "6-digit TOTP passcode from authenticator app",
  })
  @IsString({ message: "passcode must be a string" })
  @Matches(/^\d{6}$/, { message: "passcode must be 6 digits" })
  passcode!: string;
}

export class DisableTotpRequestDto {
  @ApiPropertyOptional({
    example: "123456",
    description: "Current 6-digit TOTP passcode required to disable 2FA",
  })
  @IsOptional()
  @IsString({ message: "passcode must be a string" })
  @Matches(/^\d{6}$/, { message: "passcode must be 6 digits" })
  passcode?: string;
}

export class LinkEmailRequestDto {
  @ApiProperty({ description: "Google ID Token" })
  @IsString({ message: "idToken must be a string" })
  @IsNotEmpty({ message: "idToken is required" })
  idToken!: string;
}
