import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/current-user.decorator';
import { EnhancedFileService } from '../../../common/services/enhanced-file.service';
import { FilePathService, FileCategory } from '../../../common/services/file-path.service';

@ApiTags('文件管理')
@Controller('system/files')
export class FileController {
  constructor(
    private readonly enhancedFileService: EnhancedFileService,
    private readonly filePathService: FilePathService,
  ) {}

  /**
   * 获取文件列表
   */
  @Get()
  @ApiOperation({ summary: '获取文件列表' })
  async getFileList(
    @CurrentUser('id') userId: string,
    @Query('platformId') platformId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('category') category?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.enhancedFileService.getFileList({
      platformId,
      departmentId,
      category,
      entityType,
      entityId,
      status: status || 'active',
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  /**
   * 上传文件
   */
  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        platformId: { type: 'string' },
        departmentId: { type: 'string' },
        category: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('platformId') platformId: string,
    @Query('departmentId') departmentId?: string,
    @Query('category') category?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    if (!platformId) {
      throw new BadRequestException('platformId不能为空');
    }

    if (!category) {
      throw new BadRequestException('category不能为空');
    }

    // 验证文件大小(默认50MB)
    const maxSize = 50 * 1024 * 1024;
    if (!this.filePathService.validateFileSize(file.size, maxSize)) {
      throw new BadRequestException('文件大小不能超过50MB');
    }

    return this.enhancedFileService.uploadFile(file, {
      platformId,
      departmentId,
      category: category as FileCategory,
      entityType,
      entityId,
      uploadedBy: userId,
      isPublic: isPublic === 'true',
      metadata: {
        uploadedFrom: 'file-management',
      },
    });
  }

  /**
   * 获取文件访问URL
   */
  @Get(':id/url')
  @ApiOperation({ summary: '获取文件访问URL' })
  async getFileUrl(
    @CurrentUser('id') userId: string,
    @Param('id') fileId: string,
  ) {
    return this.enhancedFileService.getFileUrl(fileId, userId);
  }

  /**
   * 获取文件详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取文件详情' })
  async getFileDetail(@Param('id') fileId: string) {
    return this.enhancedFileService.getFileDetail(fileId);
  }

  /**
   * 删除文件
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  async deleteFile(
    @CurrentUser('id') userId: string,
    @Param('id') fileId: string,
  ) {
    return this.enhancedFileService.deleteFile(fileId, userId);
  }

  /**
   * 批量删除文件
   */
  @Delete('batch')
  @ApiOperation({ summary: '批量删除文件' })
  async batchDeleteFiles(
    @CurrentUser('id') userId: string,
    @Query('ids') ids: string,
  ) {
    if (!ids) {
      throw new BadRequestException('ids不能为空');
    }

    const fileIds = ids.split(',');
    return this.enhancedFileService.batchDeleteFiles(fileIds, userId);
  }

  /**
   * 获取平台存储统计
   */
  @Get('stats/platform')
  @ApiOperation({ summary: '获取平台存储统计' })
  async getPlatformStats(@Query('platformId') platformId: string) {
    if (!platformId) {
      throw new BadRequestException('platformId不能为空');
    }

    return this.enhancedFileService.getPlatformStorageStats(platformId);
  }

  /**
   * 获取部门存储统计
   */
  @Get('stats/department')
  @ApiOperation({ summary: '获取部门存储统计' })
  async getDepartmentStats(
    @Query('platformId') platformId: string,
    @Query('departmentId') departmentId: string,
  ) {
    if (!platformId || !departmentId) {
      throw new BadRequestException('platformId和departmentId不能为空');
    }

    return this.enhancedFileService.getDepartmentStorageStats(
      platformId,
      departmentId,
    );
  }

  /**
   * 获取分类存储统计
   */
  @Get('stats/category')
  @ApiOperation({ summary: '获取分类存储统计' })
  async getCategoryStats(
    @Query('platformId') platformId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    if (!platformId) {
      throw new BadRequestException('platformId不能为空');
    }

    return this.enhancedFileService.getCategoryStorageStats(
      platformId,
      departmentId,
    );
  }

  /**
   * 获取文件分类列表
   */
  @Get('categories')
  @ApiOperation({ summary: '获取文件分类列表' })
  async getFileCategories() {
    // 返回所有可用的文件分类
    return {
      categories: Object.entries(FileCategory).map(([key, value]) => ({
        code: value,
        name: this.getCategoryName(value),
        module: this.getCategoryModule(value),
      })),
    };
  }

  /**
   * 获取分类中文名称
   */
  private getCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      'employee-id-card': '员工身份证',
      'employee-badge-photo': '员工工牌照片',
      'employee-contract': '员工合同',
      'employee-resume': '员工简历',
      'employee-certificate': '员工证书',
      'reimbursement-receipt': '报销凭证',
      'purchase-invoice': '采购发票',
      'cash-voucher': '现金凭证',
      'exam-attachment': '考试附件',
      'exam-answer-sheet': '考试答题卡',
      'knowledge-document': '知识库文档',
      'knowledge-image': '知识库图片',
      'knowledge-video': '知识库视频',
      'service-chat-image': '客服聊天图片',
      'service-chat-file': '客服聊天文件',
      'service-chat-voice': '客服聊天语音',
      'approval-attachment': '审批附件',
      'system-avatar': '系统头像',
      'system-logo': '系统Logo',
      'system-banner': '系统横幅',
      'temp-upload': '临时上传',
    };
    return nameMap[category] || category;
  }

  /**
   * 获取分类所属模块
   */
  private getCategoryModule(category: string): string {
    if (category.startsWith('employee-')) return '人事模块';
    if (category.startsWith('reimbursement-') || category.startsWith('purchase-') || category.startsWith('cash-')) return '财务模块';
    if (category.startsWith('exam-')) return '考试模块';
    if (category.startsWith('knowledge-')) return '知识库模块';
    if (category.startsWith('service-')) return '客服模块';
    if (category.startsWith('approval-')) return '审批模块';
    if (category.startsWith('system-')) return '系统模块';
    return '其他';
  }
}
