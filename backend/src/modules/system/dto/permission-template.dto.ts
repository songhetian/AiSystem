import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePermissionTemplateDto {
  @ApiProperty({ description: "模板名称" })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ description: "模板类型", enum: ["system", "custom"] })
  @IsEnum(["system", "custom"])
  @IsNotEmpty()
  templateType: string;

  @ApiProperty({ description: "模板描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "权限配置" })
  @IsNotEmpty()
  permissionConfig: {
    type?: "all" | "custom";
    menuIds?: string[];
    buttonIds?: string[];
  };

  @ApiProperty({ description: "分类", required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: "平台ID", required: false })
  @IsString()
  @IsOptional()
  platformId?: string;

  @ApiProperty({ description: "部门ID", required: false })
  @IsString()
  @IsOptional()
  deptId?: string;
}

export class UpdatePermissionTemplateDto {
  @ApiProperty({ description: "模板ID" })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: "模板名称", required: false })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiProperty({ description: "模板描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "权限配置", required: false })
  @IsOptional()
  permissionConfig?: {
    type?: "all" | "custom";
    menuIds?: string[];
    buttonIds?: string[];
  };

  @ApiProperty({ description: "分类", required: false })
  @IsString()
  @IsOptional()
  category?: string;
}

export class QueryPermissionTemplateDto {
  @ApiProperty({ description: "模板类型", required: false })
  @IsString()
  @IsOptional()
  templateType?: string;

  @ApiProperty({ description: "分类", required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: "搜索关键词", required: false })
  @IsString()
  @IsOptional()
  keyword?: string;
}

export class ApplyTemplateDto {
  @ApiProperty({ description: "模板ID" })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: "角色ID" })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: "是否部分套用", required: false })
  @IsInt()
  @IsOptional()
  partial?: number;

  @ApiProperty({
    description: "选中的权限ID列表（部分套用时使用）",
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  selectedPermissionIds?: string[];
}

export class ExportTemplateDto {
  @ApiProperty({ description: "模板ID列表", type: [String] })
  @IsArray()
  @IsNotEmpty()
  templateIds: string[];

  @ApiProperty({ description: "是否加密", required: false })
  @IsInt()
  @IsOptional()
  encrypted?: number;
}

export class ImportTemplateDto {
  @ApiProperty({ description: "模板数据" })
  @IsNotEmpty()
  templates: any[];

  @ApiProperty({ description: "是否覆盖同名模板", required: false })
  @IsInt()
  @IsOptional()
  overwrite?: number;
}
