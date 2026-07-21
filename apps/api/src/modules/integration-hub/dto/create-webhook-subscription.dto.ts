import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ example: "time.leave.requested.v1" })
  @IsString()
  eventType!: string;

  @ApiProperty({ example: "https://example.com/webhooks/hrms" })
  @IsUrl({ require_tld: false })
  targetUrl!: string;

  @ApiProperty({
    example: "super-secret",
    description: "Shared secret used to sign deliveries",
  })
  @IsString()
  @MinLength(8)
  secret!: string;

  @ApiProperty({ example: "active", required: false, enum: ["active", "disabled"] })
  @IsOptional()
  @IsIn(["active", "disabled"])
  status?: "active" | "disabled";
}
