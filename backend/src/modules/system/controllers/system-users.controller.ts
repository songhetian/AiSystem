import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BatchUpdateUserStatusDto } from '../dto/batch-update-user-status.dto';
import { Permission } from '../../../common/permission.decorator';
import { CreateUserDto } from '../dto/create-user.dto';
import { ResetUserPasswordDto } from '../dto/reset-user-password.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SystemUsersService } from '../services/system-users.service';

@Controller('system/users')
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Get()
  @Permission('system:user:list')
  findAll() {
    return this.systemUsersService.findAll();
  }

  @Post()
  @Permission('system:user:create')
  create(@Body() dto: CreateUserDto) {
    return this.systemUsersService.create(dto);
  }

  @Patch(':id')
  @Permission('system:user:update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.systemUsersService.update(id, dto);
  }

  @Patch(':id/reset-password')
  @Permission('system:user:reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.systemUsersService.resetPassword(id, dto.password);
  }

  @Patch('batch/status')
  @Permission('system:user:batch-status')
  batchUpdateStatus(@Body() dto: BatchUpdateUserStatusDto) {
    return this.systemUsersService.batchUpdateStatus(dto.ids, dto.status);
  }

  @Delete(':id')
  @Permission('system:user:delete')
  remove(@Param('id') id: string) {
    return this.systemUsersService.remove(id);
  }
}
