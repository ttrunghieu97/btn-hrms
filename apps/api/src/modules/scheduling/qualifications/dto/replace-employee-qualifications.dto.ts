import { IsArray, IsUUID, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReplaceEmployeeQualificationsDto {
  @ApiProperty({
    description: "List of position IDs the employee is qualified for",
    type: [String],
    example: ["uuid-1", "uuid-2"],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  positionIds: string[];
}
