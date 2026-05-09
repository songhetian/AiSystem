import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { RateLimit, RateLimitType } from "../../../common/decorators/rate-limiter.decorator";
import { ReimbursementService } from "../services/reimbursement.service";
import { CreateReimbursementDto } from "../dto/create-reimbursement.dto";
import { UpdateReimbursementDto } from "../dto/update-reimbursement.dto";
import { QueryReimbursementDto } from "../dto/query-reimbursement.dto";

@ApiTags("报销管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("approval/reimbursements")
export class ReimbursementController {
  private readonly logger = new Logger(ReimbursementController.name);

  constructor(private readonly reimbursementService: ReimbursementService) {}

  @Post()
  @ApiOperation({ summary: "创建报销申请" })
  @ApiResponse({ status: HttpStatus.CREATED, description: "创建成功" })
  @Permission("approval:reimbursement:create")
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateReimbursementDto) {
    return this.reimbursementService.create(dto, user.id!);
  }

  @Get()
  @ApiOperation({ summary: "获取报销申请列表" })
  @ApiResponse({ status: 200, description: "成功返回报销列表" })
  @Permission("approval:reimbursement:list")
  findMany(@Query() query: QueryReimbursementDto) {
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    return this.reimbursementService.findMany(serviceQuery);
  }

  @Get("stats")
  @ApiOperation({ summary: "获取报销统计数据" })
  @Permission("approval:reimbursement:stats")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getStats(
    @Query("platformId") platformId?: string,
    @Query("deptId") deptId?: string,
    @Query("applicantId") applicantId?: string,
  ) {
    return this.reimbursementService.getStats(platformId, deptId, applicantId);
  }

  @Get("export")
  @ApiOperation({ summary: "导出报销记录" })
  @Permission("approval:reimbursement:export")
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  async exportReimbursements(@Query() query: QueryReimbursementDto, @Res() res: Response) {
    const serviceQuery: any = {
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    const buffer = await this.reimbursementService.exportReimbursements(serviceQuery);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=reimbursements.xlsx",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取报销申请详情" })
  @Permission("approval:reimbursement:detail")
  findById(@Param("id") id: string) {
    return this.reimbursementService.findById(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新报销申请" })
  @Permission("approval:reimbursement:update")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateReimbursementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reimbursementService.update(id, dto, user.id!);
  }

  @Delete(":id")
  @ApiOperation({ summary: "撤回报销申请" })
  @Permission("approval:reimbursement:cancel")
  withdraw(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.reimbursementService.withdraw(id, user.id!);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "更新报销状态" })
  @Permission("approval:reimbursement:audit")
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: number,
    @Body("payMethod") payMethod: string,
    @Body("remark") remark: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reimbursementService.updateStatus(id, status, user.id!, payMethod, remark);
  }
}
