import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/permission.decorator';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { ShiftsService } from '../services/shifts.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';

@Controller('attendance/shifts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Permission('attendance:shifts:create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(user.sub, createShiftDto);
  }

  @Get()
  @Permission('attendance:shifts:list')
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: { platform_id?: string; dept_id?: string; name?: string }) {
    return this.shiftsService.findAll(user.sub, query);
  }

  @Get(':id')
  @Permission('attendance:shifts:query')
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.shiftsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @Permission('attendance:shifts:update')
  async update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(user.sub, id, updateShiftDto);
  }

  @Delete(':id')
  @Permission('attendance:shifts:delete')
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.shiftsService.remove(user.sub, id);
  }
}
