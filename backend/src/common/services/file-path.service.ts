import { Injectable } from '@nestjs/common';

/**
 * 文件分类枚举
 */
export enum FileCategory {
  // 人事模块
  EMPLOYEE_ID_CARD = 'employee-id-card',
  EMPLOYEE_BADGE = 'employee-badge-photo',
  EMPLOYEE_CONTRACT = 'employee-contract',
  EMPLOYEE_RESUME = 'employee-resume',
  EMPLOYEE_CERTIFICATE = 'employee-certificate',
  
  // 财务模块
  REIMBURSEMENT_RECEIPT = 'reimbursement-receipt',
  PURCHASE_INVOICE = 'purchase-invoice',
  CASH_VOUCHER = 'cash-voucher',
  
  // 考试模块
  EXAM_ATTACHMENT = 'exam-attachment',
  EXAM_ANSWER_SHEET = 'exam-answer-sheet',
  
  // 知识库模块
  KNOWLEDGE_DOCUMENT = 'knowledge-document',
  KNOWLEDGE_IMAGE = 'knowledge-image',
  KNOWLEDGE_VIDEO = 'knowledge-video',
  
  // 客服模块
  SERVICE_CHAT_IMAGE = 'service-chat-image',
  SERVICE_CHAT_FILE = 'service-chat-file',
  SERVICE_CHAT_VOICE = 'service-chat-voice',
  
  // 审批模块
  APPROVAL_ATTACHMENT = 'approval-attachment',
  
  // 系统模块
  SYSTEM_AVATAR = 'system-avatar',
  SYSTEM_LOGO = 'system-logo',
  SYSTEM_BANNER = 'system-banner',
  
  // 临时文件
  TEMP_UPLOAD = 'temp-upload',
}

/**
 * 文件路径生成选项
 */
export interface FilePathOptions {
  platformId: string;
  departmentId?: string;
  category: FileCategory;
  entityId?: string;
  filename: string;
  subPath?: string;
}

/**
 * 文件路径服务
 * 负责生成标准化的文件存储路径
 */
@Injectable()
export class FilePathService {
  /**
   * 生成标准化的文件路径
   * 格式: platform/department/category/entity/subPath/timestamp-filename
   * 
   * @example
   * generatePath({
   *   platformId: 'platform-001',
   *   departmentId: 'dept-001',
   *   category: FileCategory.EMPLOYEE_ID_CARD,
   *   entityId: 'emp-001',
   *   filename: 'id-card.jpg',
   *   subPath: 'front'
   * })
   * // 返回: platform-001/dept-001/employee-id-card/emp-001/front/1234567890-id-card.jpg
   */
  generatePath(options: FilePathOptions): string {
    const {
      platformId,
      departmentId,
      category,
      entityId,
      filename,
      subPath,
    } = options;

    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(filename);
    
    // 基础路径: platform/department/category
    let path = platformId;
    
    if (departmentId) {
      path += `/${departmentId}`;
    } else {
      path += '/common';
    }
    
    path += `/${category}`;
    
    // 实体ID路径
    if (entityId) {
      path += `/${entityId}`;
    }
    
    // 子路径(如 front/back)
    if (subPath) {
      path += `/${subPath}`;
    }
    
    // 文件名: timestamp-原始文件名
    path += `/${timestamp}-${sanitizedFilename}`;
    
    return path;
  }

  /**
   * 解析文件路径
   * 
   * @param path 文件路径
   * @returns 解析后的路径信息
   */
  parsePath(path: string): {
    platformId: string;
    departmentId: string;
    category: string;
    entityId?: string;
    filename: string;
  } {
    const parts = path.split('/');
    
    return {
      platformId: parts[0],
      departmentId: parts[1],
      category: parts[2],
      entityId: parts[3] !== undefined && !parts[3].includes('-') ? parts[3] : undefined,
      filename: parts[parts.length - 1],
    };
  }

  /**
   * 清理文件名(移除特殊字符)
   * 
   * @param filename 原始文件名
   * @returns 清理后的文件名
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200); // 限制文件名长度
  }

  /**
   * 生成缩略图路径
   * 
   * @param originalPath 原始文件路径
   * @returns 缩略图路径
   */
  generateThumbnailPath(originalPath: string): string {
    const parts = originalPath.split('/');
    const filename = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join('/');
    
    return `${dir}/thumbnails/thumb_${filename}`;
  }

  /**
   * 获取文件扩展名
   * 
   * @param filename 文件名
   * @returns 扩展名(小写)
   */
  getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ext;
  }

  /**
   * 验证文件类型
   * 
   * @param filename 文件名
   * @param allowedTypes 允许的扩展名列表
   * @returns 是否允许
   */
  validateFileType(filename: string, allowedTypes: string[]): boolean {
    const ext = this.getExtension(filename);
    return allowedTypes.includes(ext);
  }

  /**
   * 获取MIME类型对应的分类
   * 
   * @param mimeType MIME类型
   * @returns 文件分类
   */
  getFileTypeCategory(mimeType: string): 'image' | 'document' | 'video' | 'audio' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('text')
    ) {
      return 'document';
    }
    return 'other';
  }

  /**
   * 验证文件大小
   * 
   * @param fileSize 文件大小(字节)
   * @param maxSize 最大大小(字节)
   * @returns 是否允许
   */
  validateFileSize(fileSize: number, maxSize: number): boolean {
    return fileSize <= maxSize;
  }

  /**
   * 格式化文件大小
   * 
   * @param bytes 字节数
   * @returns 可读的文件大小
   */
  formatFileSize(bytes: number | bigint): string {
    const size = Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
