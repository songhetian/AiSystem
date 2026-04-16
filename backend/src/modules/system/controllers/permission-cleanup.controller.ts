import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { Permission } from "../../../common/permission.decorator";
import { PermissionCleanupService } from "../services/permission-cleanup.service";

@ApiTags("系统管理 - 权限清理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("system/permission-cleanup")
export class PermissionCleanupController {
  constructor(private readonly cleanupService: PermissionCleanupService) {}

  @Get("detect")
  @Permission("system:permission:cleanup")
  @ApiOperation({ summary: "检测冗余配置" })
  async detectRedundantPermissions() {
    return await this.cleanupService.detectRedundantPermissions();
  }

  @Post("execute")
  @Permission("system:permission:cleanup")
  @ApiOperation({ summary: "执行清理" })
  async cleanupRedundantPermissions() {
    return await this.cleanupService.cleanupRedundantPermissions();
  }
}
