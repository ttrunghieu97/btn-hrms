import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserAccessControlRequestDto {
  @ApiProperty({ description: "List of role IDs assigned to the user", type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];

  @ApiProperty({ description: "List of permission codes directly assigned to the user", type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];

  @ApiProperty({ description: "Promote user to super administrator", required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}
