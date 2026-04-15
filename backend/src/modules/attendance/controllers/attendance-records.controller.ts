import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Permission } from '../../../common/permission.decorator';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { AttendanceRecordsService } from '../services/attendance-records.service';
import { QueryAttendanceRecordsDto } from '../dto/query-attendance-records.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { AntiShake } from '../../../common/decorators/antishake.decorator';

@Controller('attendance/records')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceRecordsController {
  constructor(private readonly recordsService: AttendanceRecordsService) {}

  @Post('clock-in')
  @Permission('attendance:records:update')
  @AntiShake(5000)
  @Idempotent({ mode: 'active', ttl: 300 })
  async clockIn(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { type: 'on' | 'off'; location?: string },
  ) {
    return this.recordsService.clockIn(user.sub, body);
  }

  @Get()
  @Permission('attendance:records:list')
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryAttendanceRecordsDto,
  ) {
    return this.recordsService.findAll(userId, query);
  }

  @Get('statistics')
  @Permission('attendance:records:stats')
  async getStatistics(
    @CurrentUser('id') userId: string,
    @Query() query: { month: string; dept_id?: string; platform_id?: string },
  ) {
    return this.recordsService.getStatistics(userId, query);
  }

  @Post(':id/recalculate')
  @Permission('attendance:records:update')
  async reCalculate(@Param('id') id: string) {
    return this.recordsService.reCalculate(id);
  }
}
