import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FormBuilderService, FieldConfig, FormConfig, ValidationRule } from './form-builder.service';
import { MinioService } from '../../../common/services/minio.service';

describe('FormBuilderService', () => {
  let service: FormBuilderService;
  let minioService: jest.Mocked<MinioService>;

  const mockTemplate = {
    id: 'template-1',
    name: '测试表单模板',
    form_fields: [
      {
        id: 'applicant_name',
        name: 'applicant_name',
        label: '申请人姓名',
        type: 'text',
        required: true,
        placeholder: '请输入申请人姓名',
      },
      {
        id: 'amount',
        name: 'amount',
        label: '申请金额',
        type: 'number',
        required: true,
        validation: [
          { type: 'min', value: 1, message: '金额必须大于0' },
          { type: 'max', value: 100000, message: '金额不能超过10万' },
        ],
      },
      {
        id: 'category',
        name: 'category',
        label: '申请类别',
        type: 'select',
        required: true,
        options: [
          { label: '办公用品', value: 'office' },
          { label: '设备采购', value: 'equipment' },
          { label: '差旅费用', value: 'travel' },
        ],
      },
      {
        id: 'description',
        name: 'description',
        label: '申请说明',
        type: 'textarea',
        required: false,
        placeholder: '请详细说明申请原因',
      },
      {
        id: 'attachments',
        name: 'attachments',
        label: '相关附件',
        type: 'file',
        required: false,
      },
    ],
    layout: 'vertical',
    labelWidth: 120,
    submitText: '提交申请',
    resetText: '重置表单',
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('mock file content'),
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const mockMinioService = {
      uploadObject: jest.fn(),
      ensureBucket: jest.fn(),
      getPresignedUrl: jest.fn(),
      downloadObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormBuilderService,
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<FormBuilderService>(FormBuilderService);
    minioService = module.get(MinioService);
  });

  describe('buildForm', () => {
    it('should build form configuration successfully', () => {
      // Act
      const result = service.buildForm(mockTemplate);

      // Assert
      expect(result).toBeDefined();
      expect(result.fields).toHaveLength(5);
      expect(result.layout).toBe('vertical');
      expect(result.labelWidth).toBe(120);
      expect(result.submitText).toBe('提交申请');
      expect(result.resetText).toBe('重置表单');

      // Check first field
      const firstField = result.fields[0];
      expect(firstField.id).toBe('applicant_name');
      expect(firstField.label).toBe('申请人姓名');
      expect(firstField.type).toBe('text');
      expect(firstField.required).toBe(true);
      expect(firstField.placeholder).toBe('请输入申请人姓名');
    });

    it('should handle empty form fields', () => {
      // Arrange
      const templateWithoutFields = { ...mockTemplate, form_fields: [] };

      // Act
      const result = service.buildForm(templateWithoutFields);

      // Assert
      expect(result.fields).toHaveLength(0);
      expect(result.layout).toBe('vertical');
    });

    it('should use default values when not specified', () => {
      // Arrange
      const minimalTemplate = {
        form_fields: [
          {
            id: 'test_field',
            name: 'test_field',
            label: '测试字段',
          },
        ],
      };

      // Act
      const result = service.buildForm(minimalTemplate);

      // Assert
      expect(result.layout).toBe('vertical');
      expect(result.labelWidth).toBe(120);
      expect(result.submitText).toBe('提交');
      expect(result.resetText).toBe('重置');

      const field = result.fields[0];
      expect(field.type).toBe('text');
      expect(field.required).toBe(false);
      expect(field.options).toEqual([]);
      expect(field.validation).toEqual([]);
    });
  });

  describe('validateForm', () => {
    const validationRules: ValidationRule[] = [
      { type: 'required', message: '申请人姓名不能为空' },
      { type: 'min', value: 1, message: '金额必须大于0' },
      { type: 'max', value: 100000, message: '金额不能超过10万' },
      { type: 'pattern', value: '^[\\u4e00-\\u9fa5]+$', message: '姓名只能包含中文字符' },
    ];

    it('should validate form data successfully', () => {
      // Arrange
      const formData = {
        required: '张三',
        min: 1000,
        max: 50000,
        pattern: '张三',
      };

      // Act
      const result = service.validateForm(formData, validationRules);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid data', () => {
      // Arrange
      const formData = {
        required: '', // 空值
        min: 0, // 小于最小值
        max: 200000, // 大于最大值
        pattern: 'John', // 不匹配中文模式
      };

      // Act
      const result = service.validateForm(formData, validationRules);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0].message).toBe('申请人姓名不能为空');
      expect(result.errors[1].message).toBe('金额必须大于0');
      expect(result.errors[2].message).toBe('金额不能超过10万');
      expect(result.errors[3].message).toBe('姓名只能包含中文字符');
    });

    it('should handle custom validation rules', () => {
      // Arrange
      const customRules: ValidationRule[] = [
        {
          type: 'custom',
          message: '邮箱格式不正确',
          validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        },
      ];

      const validData = { custom: 'test@example.com' };
      const invalidData = { custom: 'invalid-email' };

      // Act
      const validResult = service.validateForm(validData, customRules);
      const invalidResult = service.validateForm(invalidData, customRules);

      // Assert
      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].message).toBe('邮箱格式不正确');
    });
  });

  describe('validateFormConfig', () => {
    it('should validate form config successfully', () => {
      // Arrange
      const validConfig: FormConfig = {
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            label: '邮箱',
            type: 'text',
            required: false,
          },
        ],
      };

      // Act
      const result = service.validateFormConfig(validConfig);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when no fields', () => {
      // Arrange
      const configWithoutFields: FormConfig = {
        fields: [],
      };

      // Act
      const result = service.validateFormConfig(configWithoutFields);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('表单必须包含至少一个字段');
    });

    it('should return error for invalid field config', () => {
      // Arrange
      const configWithInvalidFields: FormConfig = {
        fields: [
          {
            id: '',
            name: '',
            label: '',
            type: 'invalid-type' as any,
            required: true,
          },
        ],
      };

      // Act
      const result = service.validateFormConfig(configWithInvalidFields);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('字段ID不能为空'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('字段名称不能为空'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('字段标签不能为空'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('无效的字段类型'))).toBe(true);
    });

    it('should return error for duplicate field IDs', () => {
      // Arrange
      const configWithDuplicateIds: FormConfig = {
        fields: [
          {
            id: 'duplicate',
            name: 'field1',
            label: '字段1',
            type: 'text',
            required: true,
          },
          {
            id: 'duplicate',
            name: 'field2',
            label: '字段2',
            type: 'text',
            required: true,
          },
        ],
      };

      // Act
      const result = service.validateFormConfig(configWithDuplicateIds);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('字段ID重复: duplicate'))).toBe(true);
    });

    it('should return error for select fields without options', () => {
      // Arrange
      const configWithSelectWithoutOptions: FormConfig = {
        fields: [
          {
            id: 'category',
            name: 'category',
            label: '类别',
            type: 'select',
            required: true,
            options: [],
          },
        ],
      };

      // Act
      const result = service.validateFormConfig(configWithSelectWithoutOptions);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('select 类型字段必须提供选项'))).toBe(true);
    });
  });

  describe('handleFileUpload', () => {
    it('should upload file successfully', async () => {
      // Arrange
      minioService.uploadObject.mockResolvedValue({
        bucket: 'approval-files',
        objectName: '123456_abc.pdf',
        url: '/approval-files/123456_abc.pdf',
      });

      // Act
      const result = await service.handleFileUpload(mockFile);

      // Assert
      expect(result).toBe('/approval-files/123456_abc.pdf');
      expect(minioService.uploadObject).toHaveBeenCalledWith(
        expect.stringMatching(/^\d+_[a-z0-9]+\.pdf$/),
        mockFile.buffer,
        'application/pdf'
      );
    });

    it('should throw error for oversized file', async () => {
      // Arrange
      const oversizedFile = {
        ...mockFile,
        size: 15 * 1024 * 1024, // 15MB
      };

      // Act & Assert
      await expect(service.handleFileUpload(oversizedFile)).rejects.toThrow(
        '文件大小不能超过10MB'
      );
    });

    it('should throw error for unsupported file type', async () => {
      // Arrange
      const unsupportedFile = {
        ...mockFile,
        mimetype: 'application/x-executable',
        originalname: 'malware.exe',
      };

      // Act & Assert
      await expect(service.handleFileUpload(unsupportedFile)).rejects.toThrow(
        '不支持的文件类型'
      );
    });

    it('should handle upload failure', async () => {
      // Arrange
      minioService.uploadObject.mockRejectedValue(new Error('Upload failed'));

      // Act & Assert
      await expect(service.handleFileUpload(mockFile)).rejects.toThrow(
        '文件上传失败: Upload failed'
      );
    });
  });

  describe('handleMultipleFileUpload', () => {
    it('should upload multiple files successfully', async () => {
      // Arrange
      const files = [
        mockFile,
        { ...mockFile, originalname: 'document2.pdf' },
      ];

      minioService.uploadObject
        .mockResolvedValueOnce({ bucket: 'test', objectName: 'file1', url: 'url1' })
        .mockResolvedValueOnce({ bucket: 'test', objectName: 'file2', url: 'url2' });

      // Act
      const result = await service.handleMultipleFileUpload(files);

      // Assert
      expect(result).toEqual(['url1', 'url2']);
      expect(minioService.uploadObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('serializeFormData', () => {
    it('should serialize form data correctly', () => {
      // Arrange
      const formData = {
        text_field: 'Hello World',
        number_field: '123',
        date_field: new Date('2024-01-01'),
        checkbox_field: true,
        multiselect_field: ['option1', 'option2'],
      };

      const config: FormConfig = {
        fields: [
          { id: 'text_field', name: 'text_field', label: 'Text', type: 'text', required: false },
          { id: 'number_field', name: 'number_field', label: 'Number', type: 'number', required: false },
          { id: 'date_field', name: 'date_field', label: 'Date', type: 'date', required: false },
          { id: 'checkbox_field', name: 'checkbox_field', label: 'Checkbox', type: 'checkbox', required: false },
          { id: 'multiselect_field', name: 'multiselect_field', label: 'Multi Select', type: 'multiselect', required: false },
        ],
      };

      // Act
      const result = service.serializeFormData(formData, config);

      // Assert
      expect(result.text_field).toBe('Hello World');
      expect(result.number_field).toBe(123);
      expect(result.date_field).toBe('2024-01-01T00:00:00.000Z');
      expect(result.checkbox_field).toBe(true);
      expect(result.multiselect_field).toEqual(['option1', 'option2']);
    });
  });

  describe('deserializeFormData', () => {
    it('should deserialize form data correctly', () => {
      // Arrange
      const serializedData = {
        text_field: 'Hello World',
        number_field: 123,
        date_field: '2024-01-01T00:00:00.000Z',
        checkbox_field: true,
        multiselect_field: ['option1', 'option2'],
      };

      const config: FormConfig = {
        fields: [
          { id: 'text_field', name: 'text_field', label: 'Text', type: 'text', required: false },
          { id: 'number_field', name: 'number_field', label: 'Number', type: 'number', required: false },
          { id: 'date_field', name: 'date_field', label: 'Date', type: 'date', required: false },
          { id: 'checkbox_field', name: 'checkbox_field', label: 'Checkbox', type: 'checkbox', required: false },
          { id: 'multiselect_field', name: 'multiselect_field', label: 'Multi Select', type: 'multiselect', required: false },
          { id: 'default_field', name: 'default_field', label: 'Default', type: 'text', required: false, defaultValue: 'default_value' },
        ],
      };

      // Act
      const result = service.deserializeFormData(serializedData, config);

      // Assert
      expect(result.text_field).toBe('Hello World');
      expect(result.number_field).toBe(123);
      expect(result.date_field).toBeInstanceOf(Date);
      expect(result.checkbox_field).toBe(true);
      expect(result.multiselect_field).toEqual(['option1', 'option2']);
      expect(result.default_field).toBe('default_value');
    });
  });

  describe('generateFormPreview', () => {
    it('should generate HTML preview correctly', () => {
      // Arrange
      const config: FormConfig = {
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            required: true,
            placeholder: '请输入姓名',
          },
          {
            id: 'category',
            name: 'category',
            label: '类别',
            type: 'select',
            required: true,
            options: [
              { label: '选项1', value: 'option1' },
              { label: '选项2', value: 'option2' },
            ],
          },
          {
            id: 'agree',
            name: 'agree',
            label: '同意条款',
            type: 'checkbox',
            required: false,
          },
        ],
        submitText: '提交',
        resetText: '重置',
      };

      // Act
      const result = service.generateFormPreview(config);

      // Assert
      expect(result).toContain('<form class="approval-form">');
      expect(result).toContain('<label for="name">姓名 *</label>');
      expect(result).toContain('placeholder="请输入姓名"');
      expect(result).toContain('<select id="category"');
      expect(result).toContain('<option value="option1" >选项1</option>');
      expect(result).toContain('<input type="checkbox" id="agree"');
      expect(result).toContain('<button type="submit">提交</button>');
      expect(result).toContain('<button type="reset">重置</button>');
    });
  });
});
