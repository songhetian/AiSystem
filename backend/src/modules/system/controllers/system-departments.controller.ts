import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { SystemDepartmentsService } from '../services/system-departments.service';

@Controller('system/departments')
export class SystemDepartmentsController {
  constructor(private readonly systemDepartmentsService: SystemDepartmentsService) {}

  @Get()
  @Permission('system:department:list')
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemDepartmentsService.findAll(user.sub);
  }

  @Get('tree')
  @Permission('system:department:list')
  findTree(@CurrentUser() user: CurrentUserPayload) {
    return this.systemDepartmentsService.findTree(user.sub);
  }

  @Post()
  @Permission('system:department:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDepartmentDto) {
    return this.systemDepartmentsService.create(user.sub, dto);
  }

  @Patch(':id')
  @Permission('system:department:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.systemDepartmentsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @Permission('system:department:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.systemDepartmentsService.remove(user.sub, id);
  }
}
