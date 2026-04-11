import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/permission.decorator';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { SystemIntegrationService } from '../services/system-integration.service';

@Controller('system/integrations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SystemIntegrationsController {
  constructor(private readonly systemIntegrationService: SystemIntegrationService) {}

  @Get()
  @Permission('system:integration:list')
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemIntegrationService.findAll(user.sub);
  }

  @Post()
  @Permission('system:integration:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.systemIntegrationService.save(user.sub, dto);
  }

  @Patch(':id')
  @Permission('system:integration:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: any) {
    return this.systemIntegrationService.save(user.sub, { ...dto, id });
  }

  @Delete(':id')
  @Permission('system:integration:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.systemIntegrationService.remove(user.sub, id);
  }
}
