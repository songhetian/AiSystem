import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { AssignRolePermissionsDto } from '../dto/assign-role-permissions.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';
import { SystemPermissionsService } from '../services/system-permissions.service';

@Controller('system/permissions')
export class SystemPermissionsController {
  constructor(private readonly systemPermissionsService: SystemPermissionsService) {}

  @Post('user-roles')
  @Permission('system:user:assign-role')
  assignUserRoles(@Body() dto: AssignUserRolesDto) {
    return this.systemPermissionsService.assignUserRoles(dto);
  }

  @Post('role-resources')
  @Permission('system:role:assign-permission')
  assignRoleResources(@Body() dto: AssignRolePermissionsDto) {
    return this.systemPermissionsService.assignRoleResources(dto);
  }

  @Get('user-roles/:userId')
  @Permission('system:user:assign-role')
  getUserRoles(@Param('userId') userId: string) {
    return this.systemPermissionsService.getUserRoles(userId);
  }

  @Get('role-resources/:roleId')
  @Permission('system:role:assign-permission')
  getRoleResources(@Param('roleId') roleId: string) {
    return this.systemPermissionsService.getRoleResources(roleId);
  }
}
