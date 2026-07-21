import { PartialType } from "@nestjs/swagger";
import { CreateWorkforceShiftTemplateDto } from "./create-workforce-shift-template.dto";

export class UpdateWorkforceShiftTemplateDto extends PartialType(
  CreateWorkforceShiftTemplateDto,
) {}

