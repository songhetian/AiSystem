import { Controller, Get, Query } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { QuerySystemLogsDto } from '../dto/query-system-logs.dto';
import { SystemLogsService } from '../services/system-logs.service';

@Controller('system/logs')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get('login')
  @Permission('system:logs:login:list')
  listLoginLogs(@Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listLoginLogs(query);
  }

  @Get('operation')
  @Permission('system:logs:operation:list')
  listOperationLogs(@Query() query: QuerySystemLogsDto) {
    return this.systemLogsService.listOperationLogs(query);
  }
}
