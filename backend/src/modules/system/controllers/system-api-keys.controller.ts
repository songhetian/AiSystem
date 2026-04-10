import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { ExternalApiKeyService } from '../services/external-api-key.service';

@Controller('system/api-keys')
export class SystemApiKeysController {
  constructor(private readonly externalApiKeyService: ExternalApiKeyService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.externalApiKeyService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.externalApiKeyService.save(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: any) {
    return this.externalApiKeyService.save(user.sub, { ...dto, id });
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.externalApiKeyService.remove(user.sub, id);
  }
}
