import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUrl, MinLength } from "class-validator";

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({ example: "https://example.com/webhooks/hrms" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  targetUrl?: string;

  @ApiPropertyOptional({
    example: "new-super-secret",
    description: "Shared secret used to sign deliveries",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  secret?: string;

  @ApiPropertyOptional({ enum: ["active", "disabled"] })
  @IsOptional()
  @IsIn(["active", "disabled"])
  status?: "active" | "disabled";
}
