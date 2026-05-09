import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../../common/current-user.decorator";
import { DashboardManagerService } from "../services/dashboard-manager.service";

@Controller("system/dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardManagerController {
  constructor(private readonly dashboardManagerService: DashboardManagerService) {}

  // --- 模板管理 ---

  @Get("templates")
  listTemplates(@Query() query: any) {
    return this.dashboardManagerService.listTemplates(query);
  }

  @Post("templates")
  saveTemplate(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    if (!user.id) throw new BadRequestException("用户未登录");
    return this.dashboardManagerService.saveTemplate(data, user.id);
  }

  @Delete("templates/:id")
  deleteTemplate(@Param("id") id: string) {
    return this.dashboardManagerService.deleteTemplate(id);
  }

  // --- 分享管理 ---

  @Post("share")
  createShare(@CurrentUser() user: CurrentUserPayload, @Body() data: { templateId: string, expireDays?: number }) {
    if (!user.id) throw new BadRequestException("用户未登录");
    return this.dashboardManagerService.createShare(data.templateId, user.id, data.expireDays);
  }

  @Get("share/:token")
  getShareInfo(@Param("token") token: string) {
    return this.dashboardManagerService.getShareInfo(token);
  }

  // --- 预警管理 ---

  @Get("alerts")
  listAlerts(@Query("platformId") platformId?: string) {
    return this.dashboardManagerService.listAlerts(platformId);
  }

  @Post("alerts/:id/handle")
  handleAlert(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string, @Body("note") note: string) {
    if (!user.id) throw new BadRequestException("用户未登录");
    return this.dashboardManagerService.handleAlert(id, user.id, note);
  }
}
