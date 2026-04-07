import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { QuerySystemMessagesDto } from '../dto/query-system-messages.dto';
import { SystemMessagesService } from '../services/system-messages.service';

@Controller('system/messages')
export class SystemMessagesController {
  constructor(private readonly systemMessagesService: SystemMessagesService) {}

  @Get()
  @Permission('system:message:list')
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: QuerySystemMessagesDto) {
    return this.systemMessagesService.list(user.sub, query);
  }

  @Get('stats')
  @Permission('system:message:list')
  stats(@CurrentUser() user: CurrentUserPayload) {
    return this.systemMessagesService.stats(user.sub);
  }

  @Patch(':id/read')
  @Permission('system:message:read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.systemMessagesService.markRead(user.sub, id);
  }

  @Patch('read-all')
  @Permission('system:message:read')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.systemMessagesService.markAllRead(user.sub);
  }
}
