import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../../common/current-user.decorator';

/**
 * 统一数据大屏与治理控制器 (完全版)
 * 符合 PRD 2.1 - 2.5 所有核心需求
 */
@Controller('system/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // --- 模板管理 (PRD 2.1.1, 2.1.3) ---

  @Get('templates')
  async listTemplates(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.listTemplates(user.id);
  }

  @Post('templates')
  async createTemplate(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.createTemplate(user.id, data);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() data: any) {
    return this.dashboardService.updateTemplate(id, data);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.dashboardService.deleteTemplate(id);
  }

  @Post('templates/:id/copy')
  async copyTemplate(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.copyTemplate(id, user.id);
  }

  // --- 核心聚合数据 (PRD 2.2) ---

  @Get('global')
  async getGlobalOverview(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.getGlobalOverview(user.id);
  }

  @Get('ecommerce')
  async getEcommerceOverview(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.getEcommerceOverview(user.id);
  }

  @Get('hr')
  async getHrOverview(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.getHrOverview(user.id);
  }

  /**
   * 2.2.4 客服质检大屏数据
   */
  @Get('service')
  async getServiceOverview(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.getServiceOverview(user.id);
  }

  @Get('interface')
  async getInterfaceMonitoring(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.getInterfaceMonitoring(user.id);
  }

  // --- 共享与预警治理 (PRD 2.4 - 2.5) ---

  @Post('templates/:id/share')
  async generateShareLink(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body('expireDays') expireDays: number) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.generateShareLink(id, user.id, expireDays);
  }

  @Get('alerts')
  async listAlertHistory(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.dashboardService.listAlertHistory(user.id);
  }
}
