import { Controller, Get, Query, Res, Post, Body } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { Public } from '../../../common/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/current-user.decorator';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';
import { FrontendErrorReportDto } from '../dto/frontend-error-report.dto';
import { SystemLogsService } from '../services/system-logs.service';
import { Response } from 'express';
import { Throttle } from '../../../common/decorators/throttle.decorator';
import { DistributedLock } from '../../../common/decorators/distributed-lock.decorator';

@Controller('system/logs')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get('login')
  @Permission('system:logs:login:list')
  listLoginLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listLoginLogs(user, query);
  }

  @Get('operation')
  @Permission('system:logs:operation:list')
  listOperationLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listOperationLogs(user, query);
  }

  @Get('login/export')
  @Permission('system:logs:login:export')
  @Throttle(1, 10)
  @DistributedLock({ key: 'export:login:{user.sub}', ttl: 60 })
  async exportLoginLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto, @Res() res: Response) {
    const buffer = await this.systemLogsService.exportLogs(user, 'login', query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=login_logs_${Date.now()}.xlsx`);
    res.end(buffer);
  }

  @Get('operation/export')
  @Permission('system:logs:operation:export')
  @Throttle(1, 10)
  @DistributedLock({ key: 'export:operation:{user.sub}', ttl: 60 })
  async exportOperationLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemLogsDto, @Res() res: Response) {
    const buffer = await this.systemLogsService.exportLogs(user, 'operation', query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=operation_logs_${Date.now()}.xlsx`);
    res.end(buffer);
  }

  /**
   * 前端错误上报接口 (V1.0)
   * 职责：接收前端ErrorBoundary捕获的错误，持久化到sys_error_log
   * 
   * 特性：
   * 1. Public接口，无需登录（避免登录失败时无法上报）
   * 2. 限流：10次/60秒（防止恶意刷接口）
   * 3. 自动记录用户信息（如果已登录）
   */
  @Post('frontend-error-report')
  @Public()
  @Throttle(10, 60)
  async reportFrontendError(
    @Body() dto: FrontendErrorReportDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.systemLogsService.reportFrontendError(dto, user);
  }
}
