import { IsString, IsOptional, IsInt, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  rule_name: string;

  @ApiProperty({ description: '规则类型', enum: ['discount', 'fullcut', 'gift'] })
  @IsString()
  rule_type: string;

  @ApiProperty({ description: '规则配置' })
  rule_config: any;

  @ApiPropertyOptional({ description: '优先级', enum: [1, 2, 3], default: 3 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({ description: '状态', enum: [0, 1], default: 1 })
  @IsOptional()
  @IsInt()
  status?: number;
}

export class CreateActivityDto {
  @ApiProperty({ description: '活动名称' })
  @IsString()
  activity_name: string;

  @ApiProperty({ description: '活动类型', enum: ['discount', 'fullcut', 'gift'] })
  @IsString()
  activity_type: string;

  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  start_time: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  end_time: string;

  @ApiPropertyOptional({ description: '平台ID' })
  @IsOptional()
  @IsString()
  platform_id?: string;

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsString()
  dept_id?: string;

  @ApiPropertyOptional({ description: '店铺ID' })
  @IsOptional()
  @IsString()
  shop_id?: string;

  @ApiPropertyOptional({ description: '状态', enum: [0, 1], default: 1 })
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({ description: '活动描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '活动规则列表', type: [ActivityRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityRuleDto)
  rules?: ActivityRuleDto[];
}
