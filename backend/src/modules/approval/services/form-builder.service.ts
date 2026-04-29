import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MinioService } from '../../../common/services/minio.service';

export interface FieldConfig {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'radio';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: ValidationRule[];
  props?: Record<string, any>;
}

export interface FormConfig {
  fields: FieldConfig[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number;
  submitText?: string;
  resetText?: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

@Injectable()
export class FormBuilderService {
  private readonly logger = new Logger(FormBuilderService.name);

  constructor(private readonly minioService: MinioService) {}

  /**
   * 构建表单配置
   */
  buildForm(template: any): FormConfig {
    const formFields = Array.isArray(template.form_fields) ? template.form_fields : [];

    const config: FormConfig = {
      fields: formFields.map((field: any) => this.normalizeFieldConfig(field)),
      layout: template.layout || 'vertical',
      labelWidth: template.labelWidth || 120,
      submitText: template.submitText || '提交',
      resetText: template.resetText || '重置',
    };

    return config;
  }

  /**
   * 验证表单数据
   */
  validateForm(formData: any, rules: ValidationRule[]): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    for (const rule of rules) {
      const fieldValue = formData[rule.type];

      if (!this.validateField(fieldValue, rule)) {
        errors.push({
          field: rule.type,
          message: rule.message,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证表单配置
   */
  validateFormConfig(config: FormConfig): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (!config.fields || config.fields.length === 0) {
      errors.push({
        field: 'fields',
        message: '表单必须包含至少一个字段',
      });
    }

    // 验证字段配置
    for (let i = 0; i < config.fields.length; i++) {
      const field = config.fields[i];
      const fieldErrors = this.validateFieldConfig(field, i);
      errors.push(...fieldErrors);
    }

    // 检查字段ID唯一性
    const fieldIds = config.fields.map(f => f.id);
    const duplicateIds = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      errors.push({
        field: 'fields',
        message: `字段ID重复: ${duplicateIds.join(', ')}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(file: Express.Multer.File, bucketName = 'approval-files'): Promise<string> {
    try {
      // 验证文件类型和大小
      this.validateFile(file);

      // 生成文件名
      const fileName = this.generateFileName(file.originalname);

      // 上传到MinIO
      const result = await this.minioService.uploadObject(fileName, file.buffer, file.mimetype);

      this.logger.log(`File uploaded: ${fileName}`);
      return result.url || fileName;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`File upload failed: ${errorMessage}`);
      throw new BadRequestException(`文件上传失败: ${errorMessage}`);
    }
  }

  /**
   * 批量处理文件上传
   */
  async handleMultipleFileUpload(files: Express.Multer.File[], bucketName = 'approval-files'): Promise<string[]> {
    const uploadPromises = files.map(file => this.handleFileUpload(file, bucketName));
    return Promise.all(uploadPromises);
  }

  /**
   * 序列化表单数据
   */
  serializeFormData(formData: any, config: FormConfig): any {
    const serialized: any = {};

    for (const field of config.fields) {
      const value = formData[field.id];

      if (value !== undefined && value !== null) {
        serialized[field.id] = this.serializeFieldValue(value, field.type);
      }
    }

    return serialized;
  }

  /**
   * 反序列化表单数据
   */
  deserializeFormData(serializedData: any, config: FormConfig): any {
    const formData: any = {};

    for (const field of config.fields) {
      const value = serializedData[field.id];

      if (value !== undefined && value !== null) {
        formData[field.id] = this.deserializeFieldValue(value, field.type);
      } else if (field.defaultValue !== undefined) {
        formData[field.id] = field.defaultValue;
      }
    }

    return formData;
  }

  /**
   * 生成表单预览HTML
   */
  generateFormPreview(config: FormConfig): string {
    let html = '<form class="approval-form">';

    for (const field of config.fields) {
      html += this.generateFieldHTML(field);
    }

    html += '<div class="form-actions">';
    html += `<button type="submit">${config.submitText || '提交'}</button>`;
    html += `<button type="reset">${config.resetText || '重置'}</button>`;
    html += '</div>';
    html += '</form>';

    return html;
  }

  /**
   * 标准化字段配置
   */
  private normalizeFieldConfig(field: any): FieldConfig {
    return {
      id: field.id || field.name,
      name: field.name,
      label: field.label || field.name,
      type: field.type || 'text',
      required: Boolean(field.required),
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      options: Array.isArray(field.options) ? field.options : [],
      validation: Array.isArray(field.validation) ? field.validation : [],
      props: field.props || {},
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== undefined && value !== null && value !== '';

      case 'min':
        if (typeof value === 'number') {
          return value >= rule.value;
        }
        if (typeof value === 'string') {
          return value.length >= rule.value;
        }
        return true;

      case 'max':
        if (typeof value === 'number') {
          return value <= rule.value;
        }
        if (typeof value === 'string') {
          return value.length <= rule.value;
        }
        return true;

      case 'pattern':
        if (typeof value === 'string' && rule.value) {
          const regex = new RegExp(rule.value);
          return regex.test(value);
        }
        return true;

      case 'custom':
        if (rule.validator && typeof rule.validator === 'function') {
          return rule.validator(value);
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * 验证字段配置
   */
  private validateFieldConfig(field: FieldConfig, index: number): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];
    const fieldPath = `fields[${index}]`;

    if (!field.id) {
      errors.push({
        field: `${fieldPath}.id`,
        message: '字段ID不能为空',
      });
    }

    if (!field.name) {
      errors.push({
        field: `${fieldPath}.name`,
        message: '字段名称不能为空',
      });
    }

    if (!field.label) {
      errors.push({
        field: `${fieldPath}.label`,
        message: '字段标签不能为空',
      });
    }

    const validTypes = ['text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect', 'file', 'checkbox', 'radio'];
    if (!validTypes.includes(field.type)) {
      errors.push({
        field: `${fieldPath}.type`,
        message: `无效的字段类型: ${field.type}`,
      });
    }

    // 验证选择类型字段的选项
    if (['select', 'multiselect', 'radio'].includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        errors.push({
          field: `${fieldPath}.options`,
          message: `${field.type} 类型字段必须提供选项`,
        });
      }
    }

    return errors;
  }

  /**
   * 验证文件
   */
  private validateFile(file: Express.Multer.File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过10MB');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('不支持的文件类型');
    }
  }

  /**
   * 生成文件名
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = originalName.split('.').pop();
    return `${timestamp}_${random}.${ext}`;
  }

  /**
   * 序列化字段值
   */
  private serializeFieldValue(value: any, type: string): any {
    switch (type) {
      case 'date':
      case 'datetime':
        return value instanceof Date ? value.toISOString() : value;

      case 'number':
        return Number(value);

      case 'checkbox':
        return Boolean(value);

      case 'multiselect':
        return Array.isArray(value) ? value : [value];

      default:
        return value;
    }
  }

  /**
   * 反序列化字段值
   */
  private deserializeFieldValue(value: any, type: string): any {
    switch (type) {
      case 'date':
      case 'datetime':
        return typeof value === 'string' ? new Date(value) : value;

      case 'number':
        return Number(value);

      case 'checkbox':
        return Boolean(value);

      case 'multiselect':
        return Array.isArray(value) ? value : [value];

      default:
        return value;
    }
  }

  /**
   * 生成字段HTML
   */
  private generateFieldHTML(field: FieldConfig): string {
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';

    let html = `<div class="form-field">`;
    html += `<label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>`;

    switch (field.type) {
      case 'textarea':
        html += `<textarea id="${field.id}" name="${field.name}" ${required} ${placeholder}>${field.defaultValue || ''}</textarea>`;
        break;

      case 'select':
        html += `<select id="${field.id}" name="${field.name}" ${required}>`;
        if (field.options) {
          for (const option of field.options) {
            const selected = option.value === field.defaultValue ? 'selected' : '';
            html += `<option value="${option.value}" ${selected}>${option.label}</option>`;
          }
        }
        html += '</select>';
        break;

      case 'checkbox':
        const checked = field.defaultValue ? 'checked' : '';
        html += `<input type="checkbox" id="${field.id}" name="${field.name}" ${checked} ${required}>`;
        break;

      case 'radio':
        if (field.options) {
          for (const option of field.options) {
            const checked = option.value === field.defaultValue ? 'checked' : '';
            html += `<input type="radio" id="${field.id}_${option.value}" name="${field.name}" value="${option.value}" ${checked} ${required}>`;
            html += `<label for="${field.id}_${option.value}">${option.label}</label>`;
          }
        }
        break;

      default:
        const value = field.defaultValue ? `value="${field.defaultValue}"` : '';
        html += `<input type="${field.type}" id="${field.id}" name="${field.name}" ${value} ${required} ${placeholder}>`;
        break;
    }

    html += '</div>';
    return html;
  }
}
