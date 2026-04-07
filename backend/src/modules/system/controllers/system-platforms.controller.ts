import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { BatchUpdatePlatformStatusDto } from '../dto/batch-update-platform-status.dto';
import { CreatePlatformDto } from '../dto/create-platform.dto';
import { UpdatePlatformDto } from '../dto/update-platform.dto';
import { SystemPlatformsService } from '../services/system-platforms.service';

@Controller('system/platforms')
export class SystemPlatformsController {
  constructor(private readonly systemPlatformsService: SystemPlatformsService) {}

  @Get()
  @Permission('system:platform:list')
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemPlatformsService.findAll(user.sub);
  }

  @Post()
  @Permission('system:platform:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePlatformDto) {
    return this.systemPlatformsService.create(user.sub, dto);
  }

  @Patch(':id')
  @Permission('system:platform:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.systemPlatformsService.update(user.sub, id, dto);
  }

  @Patch('batch/status')
  @Permission('system:platform:batch-status')
  batchUpdateStatus(@CurrentUser() user: CurrentUserPayload, @Body() dto: BatchUpdatePlatformStatusDto) {
    return this.systemPlatformsService.batchUpdateStatus(user.sub, dto.ids, dto.status);
  }

  @Delete(':id')
  @Permission('system:platform:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.systemPlatformsService.remove(user.sub, id);
  }
}
