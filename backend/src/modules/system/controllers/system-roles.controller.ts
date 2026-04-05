import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CopyRoleDto } from '../dto/copy-role.dto';
import { Permission } from '../../../common/permission.decorator';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { SystemRolesService } from '../services/system-roles.service';

@Controller('system/roles')
export class SystemRolesController {
  constructor(private readonly systemRolesService: SystemRolesService) {}

  @Get()
  @Permission('system:role:list')
  findAll() {
    return this.systemRolesService.findAll();
  }

  @Post()
  @Permission('system:role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.systemRolesService.create(dto);
  }

  @Post(':id/copy')
  @Permission('system:role:copy')
  copy(@Param('id') id: string, @Body() dto: CopyRoleDto) {
    return this.systemRolesService.copy(id, dto);
  }

  @Patch(':id')
  @Permission('system:role:update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.systemRolesService.update(id, dto);
  }

  @Delete(':id')
  @Permission('system:role:delete')
  remove(@Param('id') id: string) {
    return this.systemRolesService.remove(id);
  }
}
