import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsBoolean,
} from "class-validator";

export class CreateUserRequestDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  passwordHash?: string;

  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean;
}
