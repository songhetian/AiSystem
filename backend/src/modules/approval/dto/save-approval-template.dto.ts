import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class ApprovalPersonDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  employeeNo!: string;

  @IsString()
  department!: string;

  @IsString()
  title!: string;
}

class ApprovalNodeDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsIn(['start', 'approval', 'branch', 'copy', 'end'])
  type!: 'start' | 'approval' | 'branch' | 'copy' | 'end';

  @IsInt()
  timeoutHours!: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalPersonDto)
  approvers!: ApprovalPersonDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalPersonDto)
  copies!: ApprovalPersonDto[];
}

export class SaveApprovalTemplateDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  platformId?: string;

  @IsString()
  platformName!: string;

  @IsOptional()
  @IsString()
  deptId?: string;

  @IsString()
  departmentName!: string;

  @IsIn(['enabled', 'disabled'])
  status!: 'enabled' | 'disabled';

  @IsString()
  description!: string;

  @IsString()
  updatedAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalNodeDto)
  nodes!: ApprovalNodeDto[];

  @IsOptional()
  @IsArray()
  formFields?: any[]; // 自定义表单字段配置
}
