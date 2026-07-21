import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { CreateTaskTemplateDto } from "./dto/create-task-template.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { TaskPolicies } from "../../../core/security/policies/task.policy";
import {
  CreateTaskTemplateUseCase,
  DeleteTaskTemplateUseCase,
  GetTaskTemplateUseCase,
  InstantiateTaskTemplateUseCase,
  ListTaskTemplatesUseCase,
  UpdateTaskTemplateUseCase,
} from "./use-cases";
import { CreateTaskDto } from "../tasks/dto/create-task.dto";

interface AuthRequest extends ExpressRequest {
  user: AuthUser;
}

@ApiTags("Task Templates")
@ApiBearerAuth()
@Controller()
export class TaskTemplatesController {
  constructor(
    private readonly listTaskTemplates: ListTaskTemplatesUseCase,
    private readonly getTaskTemplate: GetTaskTemplateUseCase,
    private readonly createTaskTemplate: CreateTaskTemplateUseCase,
    private readonly updateTaskTemplate: UpdateTaskTemplateUseCase,
    private readonly deleteTaskTemplate: DeleteTaskTemplateUseCase,
    private readonly instantiateTaskTemplate: InstantiateTaskTemplateUseCase,
  ) {}

  @Get()
  @CheckPolicy(TaskPolicies.viewAny)
  @ApiOperation({ summary: "List all task templates" })
  findAll() {
    return this.listTaskTemplates.execute();
  }

  @Get(":id")
  @CheckPolicy(TaskPolicies.viewAny)
  @ApiOperation({ summary: "Get a specific task template" })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.getTaskTemplate.execute(id);
  }

  @Post()
  @CheckPolicy(TaskPolicies.manage)
  @ApiOperation({ summary: "Create a new task template" })
  create(@Body() dto: CreateTaskTemplateDto, @Request() req: AuthRequest) {
    return this.createTaskTemplate.execute(dto, req.user.id);
  }

  @Patch(":id")
  @CheckPolicy(TaskPolicies.manage)
  @ApiOperation({ summary: "Update a task template" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.updateTaskTemplate.execute(id, dto);
  }

  @Delete(":id")
  @CheckPolicy(TaskPolicies.manage)
  @ApiOperation({ summary: "Delete a task template" })
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.deleteTaskTemplate.execute(id);
  }

  @Post(":id/instantiate")
  @CheckPolicy(TaskPolicies.create)
  @ApiOperation({ summary: "Instantiate a new task from a template" })
  instantiate(
    @Param("id", new ParseUUIDPipe()) templateId: string,
    @Body() overrides: Partial<CreateTaskDto>,
    @Request() req: AuthRequest,
  ) {
    return this.instantiateTaskTemplate.execute(templateId, overrides, req.user.id);
  }
}
