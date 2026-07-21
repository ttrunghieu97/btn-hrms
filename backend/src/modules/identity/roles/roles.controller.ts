import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleRequestDto, UpdateRoleRequestDto, RoleResponseDto } from './dto/role.dto';
import { CheckPolicy } from '../../../core/security/decorators/check-policy.decorator';
import { UserPolicies } from '../../../core/security/policies/user.policy';
import { ListRolesUseCase } from './use-cases/list-roles.usecase';
import { GetRoleUseCase } from './use-cases/get-role.usecase';
import { CreateRoleUseCase } from './use-cases/create-role.usecase';
import { UpdateRoleUseCase } from './use-cases/update-role.usecase';
import { DeleteRoleUseCase } from './use-cases/delete-role.usecase';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller({ path: 'roles', version: '1' })
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ type: [RoleResponseDto] })
  async findAll() {
    return this.listRoles.execute();
  }

  @Get(':id')
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: 'Get role by id' })
  @ApiResponse({ type: RoleResponseDto })
  async findOne(@Param('id') id: string) {
    return this.getRole.execute(id);
  }

  @Post()
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ type: RoleResponseDto })
  async create(@Body() body: CreateRoleRequestDto) {
    return this.createRole.execute(body);
  }

  @Put(':id')
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ type: RoleResponseDto })
  async update(@Param('id') id: string, @Body() body: UpdateRoleRequestDto) {
    return this.updateRole.execute(id, body);
  }

  @Delete(':id')
  @CheckPolicy(UserPolicies.managePermissions)
  @ApiOperation({ summary: 'Delete a role' })
  async remove(@Param('id') id: string) {
    return this.deleteRole.execute(id);
  }
}
