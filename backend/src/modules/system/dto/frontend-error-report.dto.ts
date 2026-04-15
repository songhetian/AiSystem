import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 前端错误上报 DTO
 */
export class FrontendErrorReportDto {
  @ApiProperty({ description: '错误消息' })
  @IsString()
  error: string;

  @ApiProperty({ description: '错误堆栈', required: false })
  @IsString()
  @IsOptional()
  stack?: string;

  @ApiProperty({ description: '组件堆栈', required: false })
  @IsString()
  @IsOptional()
  componentStack?: string;

  @ApiProperty({ description: '页面URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: '用户代理', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ description: '时间戳' })
  @IsString()
  timestamp: string;
}
