import { PartialType } from "@nestjs/swagger";
import { CreateTaskTemplateDto } from "./create-task-template.dto";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateTaskTemplateDto extends PartialType(CreateTaskTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
