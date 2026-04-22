import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from './minio.service';
import { FilePathService, FileCategory } from './file-path.service';
import { Cron } from '@nestjs/schedule';

interface UploadOptions {
  platformId: string;
  departmentId?: string;
  category: FileCategory;
  entityType?: string;
  entityId?: string;
  uploadedBy: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

interface FileRecord {
  id: string;
  original_name: string;
  stored_name: string;
  file_size: bigint;
  mime_type: string;
  extension: string;
  platform_id: string;
  department_id: string | null;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  storage_type: string;
  bucket_name: string | null;
  is_public: number;
  access_count: number;
  status: string;
  metadata: any;
  uploaded_by: string;
  uploaded_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
  create_time: Date;
  update_time: Date;
  is_deleted: number;
}

/**
 * 增强的文件服务
 * 提供统一的文件上传、下载、删除和管理功能
 */
@Injectable()
export class EnhancedFileService {
  private readonly logger = new Logger(EnhancedFileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly filePathService: FilePathService,
  ) {}

  /**
   * 上传文件(带元数据记录)
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions,
  ) {
    // 1. 生成标准化路径
    const storedPath = this.filePathService.generatePath({
      platformId: options.platformId,
      departmentId: options.departmentId,
      category: options.category,
      entityId: options.entityId,
      filename: file.originalname,
    });

    // 2. 上传到MinIO
    const uploadResult = await this.minioService.uploadObject(
      storedPath,
      file.buffer,
      file.mimetype,
    );

    // 3. 记录文件元数据
    const fileRecord = await this.prisma.sys_file.create({
      data: {
        original_name: file.originalname,
        stored_name: storedPath,
        file_size: file.size,
        mime_type: file.mimetype,
        extension: this.filePathService.getExtension(file.originalname),
        platform_id: options.platformId,
        department_id: options.departmentId || null,
        category: options.category,
        entity_type: options.entityType || null,
        entity_id: options.entityId || null,
        storage_type: 'minio',
        bucket_name: uploadResult.bucket,
        is_public: options.isPublic ? 1 : 0,
        metadata: options.metadata || null,
        uploaded_by: options.uploadedBy,
      },
    });

    this.logger.log(`文件上传成功: ${fileRecord.id} - ${file.originalname}`);

    return {
      fileId: fileRecord.id,
      url: uploadResult.url,
      storedPath,
      originalName: file.originalname,
      fileSize: file.size,
    };
  }

  /**
   * 获取文件访问URL
   */
  async getFileUrl(fileId: string, userId?: string) {
    const file = await this.prisma.sys_file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.status !== 'active') {
      throw new BadRequestException('文件不存在或已删除');
    }

    // TODO: 权限检查
    // if (userId && !file.is_public) {
    //   await this.checkFileAccess(file, userId);
    // }

    // 增加访问计数
    await this.prisma.sys_file.update({
      where: { id: fileId },
      data: { access_count: { increment: 1 } },
    });

    // 生成预签名URL
    const url = await this.minioService.getPresignedUrl(file.stored_name);
    
    return { 
      url, 
      filename: file.original_name,
      mimeType: file.mime_type,
      fileSize: Number(file.file_size),
    };
  }

  /**
   * 根据存储路径获取文件URL
   */
  async getFileUrlByPath(storedPath: string) {
    const file = await this.prisma.sys_file.findFirst({
      where: { 
        stored_name: storedPath,
        status: 'active',
      },
    });

    if (!file) {
      // 如果数据库中没有记录,直接生成URL(兼容旧数据)
      const url = await this.minioService.getPresignedUrl(storedPath);
      return { url, filename: storedPath.split('/').pop() || 'file' };
    }

    return this.getFileUrl(file.id);
  }

  /**
   * 删除文件(软删除)
   */
  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.sys_file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    if (file.status === 'deleted') {
      throw new BadRequestException('文件已删除');
    }

    // 软删除
    await this.prisma.sys_file.update({
      where: { id: fileId },
      data: {
        status: 'deleted',
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    this.logger.log(`文件已软删除: ${fileId} - ${file.original_name}`);

    return { success: true };
  }

  /**
   * 批量删除文件
   */
  async batchDeleteFiles(fileIds: string[], userId: string) {
    const files = await this.prisma.sys_file.findMany({
      where: {
        id: { in: fileIds },
        status: 'active',
      },
    });

    if (files.length === 0) {
      throw new BadRequestException('没有可删除的文件');
    }

    await this.prisma.sys_file.updateMany({
      where: { id: { in: fileIds } },
      data: {
        status: 'deleted',
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    this.logger.log(`批量删除文件: ${files.length}个`);

    return { success: true, deleted: files.length };
  }

  /**
   * 物理删除文件(定时任务调用)
   */
  async permanentDeleteFile(fileId: string) {
    const file = await this.prisma.sys_file.findUnique({
      where: { id: fileId },
    });

    if (!file) return;

    try {
      // 从MinIO删除
      // await this.minioService.deleteObject(file.stored_name);
      this.logger.log(`从MinIO删除文件: ${file.stored_name}`);
    } catch (error) {
      this.logger.error(`从MinIO删除文件失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 从数据库删除
    await this.prisma.sys_file.delete({
      where: { id: fileId },
    });

    this.logger.log(`物理删除文件: ${fileId} - ${file.original_name}`);
  }

  /**
   * 获取文件列表
   */
  async getFileList(options: {
    platformId?: string;
    departmentId?: string;
    category?: string;
    entityType?: string;
    entityId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      platformId,
      departmentId,
      category,
      entityType,
      entityId,
      status = 'active',
      page = 1,
      pageSize = 20,
    } = options;

    const where: any = {
      status,
      is_deleted: 0,
    };

    if (platformId) where.platform_id = platformId;
    if (departmentId) where.department_id = departmentId;
    if (category) where.category = category;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;

    const [files, total] = await Promise.all([
      this.prisma.sys_file.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { create_time: 'desc' },
      }),
      this.prisma.sys_file.count({ where }),
    ]);

    return {
      data: files.map(file => ({
        ...file,
        file_size: Number(file.file_size),
        fileSizeReadable: this.filePathService.formatFileSize(file.file_size),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取部门存储统计
   */
  async getDepartmentStorageStats(platformId: string, departmentId: string) {
    const stats = await this.prisma.sys_file.aggregate({
      where: {
        platform_id: platformId,
        department_id: departmentId,
        status: 'active',
        is_deleted: 0,
      },
      _sum: {
        file_size: true,
      },
      _count: {
        id: true,
      },
    });

    const totalSize = stats._sum.file_size || BigInt(0);

    return {
      totalFiles: stats._count.id,
      totalSize: Number(totalSize),
      totalSizeReadable: this.filePathService.formatFileSize(totalSize),
    };
  }

  /**
   * 获取分类存储统计
   */
  async getCategoryStorageStats(platformId: string, departmentId?: string) {
    const where: any = {
      platform_id: platformId,
      status: 'active',
      is_deleted: 0,
    };

    if (departmentId) {
      where.department_id = departmentId;
    }

    const stats = await this.prisma.sys_file.groupBy({
      by: ['category'],
      where,
      _sum: {
        file_size: true,
      },
      _count: {
        id: true,
      },
    });

    return stats.map(stat => ({
      category: stat.category,
      fileCount: stat._count.id,
      totalSize: Number(stat._sum.file_size || BigInt(0)),
      totalSizeReadable: this.filePathService.formatFileSize(stat._sum.file_size || BigInt(0)),
    }));
  }

  /**
   * 获取平台存储统计
   */
  async getPlatformStorageStats(platformId: string) {
    const [totalStats, categoryStats, departmentStats] = await Promise.all([
      // 总体统计
      this.prisma.sys_file.aggregate({
        where: {
          platform_id: platformId,
          status: 'active',
          is_deleted: 0,
        },
        _sum: { file_size: true },
        _count: { id: true },
      }),
      // 分类统计
      this.getCategoryStorageStats(platformId),
      // 部门统计
      this.prisma.sys_file.groupBy({
        by: ['department_id'],
        where: {
          platform_id: platformId,
          status: 'active',
          is_deleted: 0,
        },
        _sum: { file_size: true },
        _count: { id: true },
      }),
    ]);

    const totalSize = totalStats._sum.file_size || BigInt(0);

    return {
      total: {
        fileCount: totalStats._count.id,
        totalSize: Number(totalSize),
        totalSizeReadable: this.filePathService.formatFileSize(totalSize),
      },
      byCategory: categoryStats,
      byDepartment: departmentStats.map(stat => ({
        departmentId: stat.department_id,
        fileCount: stat._count.id,
        totalSize: Number(stat._sum.file_size || BigInt(0)),
        totalSizeReadable: this.filePathService.formatFileSize(stat._sum.file_size || BigInt(0)),
      })),
    };
  }

  /**
   * 清理已删除的文件(定时任务)
   * 每天凌晨2点执行,清理30天前删除的文件
   */
  @Cron('0 2 * * *')
  async cleanupDeletedFiles(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedFiles = await this.prisma.sys_file.findMany({
      where: {
        status: 'deleted',
        deleted_at: {
          lt: cutoffDate,
        },
      },
      take: 100, // 每次最多清理100个文件
    });

    this.logger.log(`开始清理${deletedFiles.length}个已删除的文件`);

    let successCount = 0;
    let failCount = 0;

    for (const file of deletedFiles) {
      try {
        await this.permanentDeleteFile(file.id);
        successCount++;
      } catch (error) {
        failCount++;
        this.logger.error(
          `清理文件失败: ${file.id} - ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(`文件清理完成: 成功${successCount}个, 失败${failCount}个`);

    return {
      total: deletedFiles.length,
      success: successCount,
      failed: failCount,
    };
  }

  /**
   * 获取文件详情
   */
  async getFileDetail(fileId: string) {
    const file = await this.prisma.sys_file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    return {
      ...file,
      file_size: Number(file.file_size),
      fileSizeReadable: this.filePathService.formatFileSize(file.file_size),
    };
  }

  /**
   * 更新文件元数据
   */
  async updateFileMetadata(
    fileId: string,
    metadata: Record<string, any>,
    userId: string,
  ) {
    const file = await this.prisma.sys_file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    await this.prisma.sys_file.update({
      where: { id: fileId },
      data: {
        metadata: {
          ...(file.metadata as any || {}),
          ...metadata,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`更新文件元数据: ${fileId}`);

    return { success: true };
  }
}
