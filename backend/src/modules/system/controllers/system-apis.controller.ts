import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { CreateApiPermissionDto } from '../dto/create-api-permission.dto';
import { UpdateApiPermissionDto } from '../dto/update-api-permission.dto';
import { SystemApisService } from '../services/system-apis.service';

@Controller('system/apis')
export class SystemApisController {
  constructor(private readonly systemApisService: SystemApisService) {}

  @Get()
  @Permission('system:api:list')
  findAll() {
    return this.systemApisService.findAll();
  }

  @Post()
  @Permission('system:api:create')
  create(@Body() dto: CreateApiPermissionDto) {
    return this.systemApisService.create(dto);
  }

  @Patch(':id')
  @Permission('system:api:update')
  update(@Param('id') id: string, @Body() dto: UpdateApiPermissionDto) {
    return this.systemApisService.update(id, dto);
  }

  @Get(':id/stats')
  @Permission('system:api:list')
  getStats(@Param('id') id: string) {
    return this.systemApisService.getStats(id);
  }

  @Delete(':id')
  @Permission('system:api:delete')
  remove(@Param('id') id: string) {
    return this.systemApisService.remove(id);
  }
}
