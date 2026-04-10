import { Controller, Get, Query } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../common/current-user.decorator';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';
import { SystemLogsService } from '../services/system-logs.service';

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
}
