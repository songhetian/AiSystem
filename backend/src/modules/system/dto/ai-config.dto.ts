import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

export class UpsertAIConfigDto {
  @ApiProperty({ description: '配置范围类型', enum: ['global', 'platform', 'department', 'shop'] })
  @IsString()
  @IsIn(['global', 'platform', 'department', 'shop'])
  scopeType: string;

  @ApiPropertyOptional({ description: '范围ID（平台ID/部门ID/店铺ID）' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiProperty({ description: 'AI服务商', enum: ['openai', 'azure', 'baidu', 'aliyun'] })
  @IsString()
  @IsIn(['openai', 'azure', 'baidu', 'aliyun'])
  provider: string;

  @ApiProperty({ description: 'API密钥' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'API地址' })
  @IsOptional()
  @IsString()
  apiBaseUrl?: string;

  @ApiProperty({ description: '模型名称' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: '最大Token数', default: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  maxTokens?: number;

  @ApiPropertyOptional({ description: '温度参数', default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ description: '额外配置' })
  @IsOptional()
  extraConfig?: any;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ListAIConfigDto {
  @ApiPropertyOptional({ description: '平台ID' })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UpdateAIConfigStatusDto {
  @ApiProperty({ description: '配置ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '状态', enum: [0, 1] })
  @IsNumber()
  @IsIn([0, 1])
  status: number;
}
