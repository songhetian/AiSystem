import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { CoverageService } from '../services/coverage.service';
import { CheckCoverageDto } from '../dto/coverage.dto';

@Controller('attendance/coverage')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  @Post('check')
  @Permission('attendance:coverage:check')
  checkCoverage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckCoverageDto
  ) {
    return this.coverageService.checkCoverage(user.sub, dto);
  }

  @Get('reports')
  @Permission('attendance:coverage:view')
  getReports(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { start_date?: string, end_date?: string }
  ) {
    return this.coverageService.getCoverageReports(user.sub, query);
  }
}
