import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ChangePasswordRequestDto {
  @ApiProperty({
    example: "current-password",
    description: "Current account password",
  })
  @IsString({ message: "Current password must be a string" })
  @IsNotEmpty({ message: "Current password is required" })
  currentPassword!: string;

  @ApiProperty({
    example: "new-password-123",
    description: "New account password",
  })
  @IsString({ message: "New password must be a string" })
  @IsNotEmpty({ message: "New password is required" })
  @MinLength(10, { message: "New password must be at least 10 characters long" })
  newPassword!: string;
}
