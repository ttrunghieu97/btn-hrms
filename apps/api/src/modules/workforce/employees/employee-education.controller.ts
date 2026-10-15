import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from "@nestjs/swagger";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { Resource } from "../../../core/security/decorators/resource.decorator";
import { Employee } from "../../../core/security/types/resource-entities";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { AddEducationUseCase } from "./use-cases/add-education.usecase";
import { UpdateEducationUseCase } from "./use-cases/update-education.usecase";
import { DeleteEducationUseCase } from "./use-cases/delete-education.usecase";
import { ListEducationsUseCase } from "./use-cases/list-educations.usecase";
import { CreateEducationDto, UpdateEducationDto } from "./dto/education.dto";

@ApiTags("Employee Education")
@ApiBearerAuth()
@Resource(Employee, "employeeId")
@Controller("employees/:employeeId/educations")
export class EmployeeEducationController {
  constructor(
    private readonly addEducation: AddEducationUseCase,
    private readonly updateEducation: UpdateEducationUseCase,
    private readonly deleteEducation: DeleteEducationUseCase,
    private readonly listEducations: ListEducationsUseCase,
  ) {}

  @Get()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.view)
  @ApiOperation({ summary: "List education records of an employee" })
  findAll(@Param("employeeId") employeeId: string) {
    return this.listEducations.execute(employeeId);
  }

  @Post()
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Add an education record" })
  create(
    @Param("employeeId") employeeId: string,
    @Body() dto: CreateEducationDto,
  ) {
    return this.addEducation.execute(employeeId, dto);
  }

  @Put(":educationId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Update an education record" })
  update(
    @Param("employeeId") employeeId: string,
    @Param("educationId") educationId: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.updateEducation.execute(employeeId, educationId, dto);
  }

  @Delete(":educationId")
  @Resource(Employee, "employeeId")
  @CheckPolicy(EmployeePolicies.edit)
  @ApiOperation({ summary: "Delete an education record" })
  remove(
    @Param("employeeId") employeeId: string,
    @Param("educationId") educationId: string,
  ) {
    return this.deleteEducation.execute(employeeId, educationId);
  }
}
