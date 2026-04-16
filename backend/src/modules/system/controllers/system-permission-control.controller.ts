import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { Permission } from "../../../common/permission.decorator";
import { SystemPermissionControlService } from "../services/system-permission-control.service";
import { BatchAssignPermissionsDto } from "../dto/batch-assign-permissions.dto";
import {
  UpdatePermissionControlDto,
  BatchUpdatePermissionControlDto,
  QueryPermissionControlDto,
} from "../dto/update-permission-control.dto";
import { UpdateSystemConfigDto } from "../dto/update-system-config.dto";

@ApiTags("系统管理 - 权限控制")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("system/permission-control")
export class SystemPermissionControlController {
  constructor(
    private readonly permissionControlService: SystemPermissionControlService,
  ) {}

  @Post("batch-assign")
  @Permission("system:permission:batch-assign")
  @ApiOperation({ summary: "批量分配/取消权限" })
  async batchAssignPermissions(@Body() dto: BatchAssignPermissionsDto) {
    return await this.permissionControlService.batchAssignPermissions(dto);
  }

  @Get("available/:roleId")
  @Permission("system:permission:view")
  @ApiOperation({ summary: "获取可分配权限" })
  async getAvailablePermissions(@Param("roleId") roleId: string) {
    return await this.permissionControlService.getAvailablePermissions(roleId);
  }

  @Get("assigned/:roleId")
  @Permission("system:permission:view")
  @ApiOperation({ summary: "获取已分配权限" })
  async getAssignedPermissions(@Param("roleId") roleId: string) {
    return await this.permissionControlService.getAssignedPermissions(roleId);
  }

  @Get("list")
  @Permission("system:permission:view")
  @ApiOperation({ summary: "获取权限控制配置列表" })
  async getPermissionControlList(@Query() query: QueryPermissionControlDto) {
    return await this.permissionControlService.getPermissionControlList(query);
  }

  @Post("update")
  @Permission("system:permission:control")
  @ApiOperation({ summary: "更新权限控制配置" })
  async updatePermissionControl(@Body() dto: UpdatePermissionControlDto) {
    return await this.permissionControlService.updatePermissionControl(dto);
  }

  @Post("batch-update")
  @Permission("system:permission:control")
  @ApiOperation({ summary: "批量更新权限控制配置" })
  async batchUpdatePermissionControl(
    @Body() dto: BatchUpdatePermissionControlDto,
  ) {
    return await this.permissionControlService.batchUpdatePermissionControl(
      dto,
    );
  }

  @Get("config/:key")
  @Permission("system:config:view")
  @ApiOperation({ summary: "获取系统配置" })
  async getSystemConfig(@Param("key") key: string) {
    return await this.permissionControlService.getSystemConfig(key);
  }

  @Post("config/update")
  @Permission("system:config:update")
  @ApiOperation({ summary: "更新系统配置" })
  async updateSystemConfig(@Body() dto: UpdateSystemConfigDto) {
    return await this.permissionControlService.updateSystemConfig(dto);
  }
}
