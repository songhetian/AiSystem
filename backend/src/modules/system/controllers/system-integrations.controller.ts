import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { SystemIntegrationService } from '../services/system-integration.service';

@Controller('system/integrations')
export class SystemIntegrationsController {
  constructor(private readonly systemIntegrationService: SystemIntegrationService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemIntegrationService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.systemIntegrationService.save(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: any) {
    return this.systemIntegrationService.save(user.sub, { ...dto, id });
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.systemIntegrationService.remove(user.sub, id);
  }
}
