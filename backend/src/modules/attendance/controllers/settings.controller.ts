import { Controller, Get, Put, Body } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { SettingsService } from '../services/settings.service';
import { UpdateAiConfigDto } from '../dto/settings.dto';

@Controller('attendance/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permission('attendance:settings:view')
  getConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getConfig(user.sub);
  }

  @Put()
  @Permission('attendance:settings:edit')
  updateConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAiConfigDto
  ) {
    return this.settingsService.updateConfig(user.sub, dto);
  }
}
