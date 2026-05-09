import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/current-user.decorator';
import { ApiDocs } from '../../../common/decorators/api-docs.decorator';
import { ApprovalProcessService } from '../services/approval-process.service';
import { CreateApprovalProcessDto } from '../dto/create-approval-process.dto';
import { UpdateApprovalProcessDto } from '../dto/update-approval-process.dto';
import { QueryApprovalProcessDto } from '../dto/query-approval-process.dto';

@ApiTags('审批流程配置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approval/process')
export class ApprovalProcessController {
  private readonly logger = new Logger(ApprovalProcessController.name);

  constructor(private readonly approvalProcessService: ApprovalProcessService) {}

  @Post()
  @ApiOperation({ summary: '创建审批流程配置' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '创建成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数错误' })
  @ApiDocs({
    summary: '创建审批流程配置',
    description: '创建新的审批流程配置，包括节点定义、审批人分配规则、流程设置等',
  })
  async createProcess(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateApprovalProcessDto,
  ) {
    try {
      // 确保设置有默认值
      const processConfig = {
        ...createDto,
        settings: createDto.settings || {
          allowRecall: true,
          allowDelegate: true,
          maxTimeout: 72,
        },
      };

      const result = await this.approvalProcessService.createProcess(userId, processConfig as any);
      return {
        code: 200,
        message: '创建成功',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取审批流程配置详情' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '流程不存在' })
  @ApiDocs({
    summary: '获取审批流程配置详情',
    description: '根据流程ID获取完整的流程配置信息',
  })
  async getProcess(@Param('id') id: string) {
    try {
      const result = await this.approvalProcessService.getProcessConfig(id);
      if (!result) {
        return {
          code: 404,
          message: '流程不存在',
          data: null,
        };
      }
      return {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新审批流程配置' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '更新成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '流程不存在' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数错误或有活跃实例' })
  @ApiDocs({
    summary: '更新审批流程配置',
    description: '更新现有的审批流程配置，会创建新版本并归档旧版本',
  })
  async updateProcess(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateApprovalProcessDto,
  ) {
    try {
      const result = await this.approvalProcessService.updateProcess(userId, id, updateDto);
      return {
        code: 200,
        message: '更新成功',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除审批流程配置' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '流程不存在' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '有活跃实例，无法删除' })
  @ApiDocs({
    summary: '删除审批流程配置',
    description: '软删除审批流程配置，如果有活跃的审批实例则无法删除',
  })
  async deleteProcess(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    try {
      await this.approvalProcessService.deleteProcess(userId, id);
      return {
        code: 200,
        message: '删除成功',
        data: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Post(':id/validate')
  @ApiOperation({ summary: '验证审批流程配置' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '验证完成' })
  @ApiDocs({
    summary: '验证审批流程配置',
    description: '验证流程配置的正确性，包括节点连接、审批人设置、循环检测等',
  })
  async validateProcess(@Param('id') id: string) {
    try {
      const processConfig = await this.approvalProcessService.getProcessConfig(id);
      if (!processConfig) {
        return {
          code: 404,
          message: '流程不存在',
          data: null,
        };
      }

      const validation = await this.approvalProcessService.validateProcessConfig(processConfig);
      return {
        code: 200,
        message: '验证完成',
        data: validation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取流程版本历史' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  @ApiDocs({
    summary: '获取流程版本历史',
    description: '获取指定流程的所有版本信息',
  })
  async getProcessVersions(@Param('id') id: string) {
    try {
      const versions = await this.approvalProcessService.getProcessVersions(id);
      return {
        code: 200,
        message: '获取成功',
        data: versions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get process versions: ${errorMessage}`);
      throw error;
    }
  }

  @Post(':id/versions/:version/activate')
  @ApiOperation({ summary: '激活指定版本' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiParam({ name: 'version', description: '版本号' })
  @ApiResponse({ status: HttpStatus.OK, description: '激活成功' })
  @ApiDocs({
    summary: '激活指定版本',
    description: '激活流程的指定版本，使其成为当前活跃版本',
  })
  async activateProcessVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('version') version: number,
  ) {
    try {
      await this.approvalProcessService.activateProcessVersion(userId, id, version);
      return {
        code: 200,
        message: '激活成功',
        data: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to activate process version: ${errorMessage}`);
      throw error;
    }
  }

  @Post(':id/copy')
  @ApiOperation({ summary: '复制审批流程' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiQuery({ name: 'name', description: '新流程名称' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '复制成功' })
  @ApiDocs({
    summary: '复制审批流程',
    description: '复制现有的审批流程配置，创建一个新的流程',
  })
  async copyProcess(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('name') newName: string,
  ) {
    try {
      const result = await this.approvalProcessService.copyProcess(userId, id, newName);
      return {
        code: 200,
        message: '复制成功',
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to copy approval process: ${errorMessage}`);
      throw error;
    }
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取流程统计信息' })
  @ApiParam({ name: 'id', description: '流程ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  @ApiDocs({
    summary: '获取流程统计信息',
    description: '获取流程的使用统计，包括实例数量、平均处理时间等',
  })
  async getProcessStats(@Param('id') id: string) {
    try {
      const stats = await this.approvalProcessService.getProcessStats(id);
      return {
        code: 200,
        message: '获取成功',
        data: stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get process stats: ${errorMessage}`);
      throw error;
    }
  }
}
