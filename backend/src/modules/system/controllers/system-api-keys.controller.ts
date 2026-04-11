import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/permission.decorator';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { ExternalApiKeyService } from '../services/external-api-key.service';

@Controller('system/api-keys')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SystemApiKeysController {
  constructor(private readonly externalApiKeyService: ExternalApiKeyService) {}

  @Get()
  @Permission('system:api-key:list')
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.externalApiKeyService.findAll(user.sub);
  }

  @Post()
  @Permission('system:api-key:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.externalApiKeyService.save(user.sub, dto);
  }

  @Patch(':id')
  @Permission('system:api-key:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: any) {
    return this.externalApiKeyService.save(user.sub, { ...dto, id });
  }

  @Delete(':id')
  @Permission('system:api-key:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.externalApiKeyService.remove(user.sub, id);
  }
}
