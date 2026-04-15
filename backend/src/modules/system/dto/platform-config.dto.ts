import { IsString, IsNotEmpty, IsOptional, IsUrl, IsInt } from 'class-validator';

export class SavePlatformConfigDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: '物理平台架构不能为空' })
  @IsString()
  platform_id: string;

  @IsNotEmpty({ message: '责任管理组织不能为空' })
  @IsString()
  dept_id: string;

  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsNotEmpty({ message: '决策模版不能为空' })
  @IsString()
  template_id: string;

  @IsNotEmpty({ message: '外部 API 端点不能为空' })
  @IsUrl({}, { message: '外部接口地址格式不合法' })
  api_endpoint: string;

  @IsNotEmpty({ message: 'App Key 不能为空' })
  @IsString()
  app_key: string;

  @IsNotEmpty({ message: 'Secret 不能为空' })
  @IsString()
  app_secret: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
