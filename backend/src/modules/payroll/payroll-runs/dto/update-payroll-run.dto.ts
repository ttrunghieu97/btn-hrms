import { PartialType } from "@nestjs/swagger";
import { CreatePayrollRunDto } from "./create-payroll-run.dto";

export class UpdatePayrollRunDto extends PartialType(CreatePayrollRunDto) {}



