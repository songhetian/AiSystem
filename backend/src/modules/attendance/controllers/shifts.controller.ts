import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/permission.decorator';
import { ShiftsService } from '../services/shifts.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';

@Controller('attendance/shifts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Permission('attendance:shifts:create')
  async create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  @Permission('attendance:shifts:list')
  async findAll(@Query() query: { platform_id?: string; dept_id?: string; name?: string }) {
    return this.shiftsService.findAll(query);
  }

  @Get(':id')
  @Permission('attendance:shifts:query')
  async findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @Permission('attendance:shifts:update')
  async update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Delete(':id')
  @Permission('attendance:shifts:delete')
  async remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
