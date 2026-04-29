import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录日志项DTO
 * Requirements: 6.1, 6.2, 6.3
 */
export class LoginLogItemDto {
  @ApiProperty({ description: '日志ID', example: 'log-001' })
  id: string;

  @ApiProperty({ description: '登录时间', example: '2024-01-15 10:30:25' })
  create_time: Date;

  @ApiProperty({ description: '登录人姓名（已转换）', example: '张三' })
  operator_name: string;

  @ApiProperty({ description: '登录用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '登录IP地址', example: '192.168.1.100' })
  login_ip: string;

  @ApiProperty({ description: '登录状态（1=成功，0=失败）', example: 1 })
  login_status: number;

  @ApiProperty({ description: '登录结果描述', example: '登录成功' })
  login_message: string;

  @ApiProperty({ description: '所属平台名称（已转换）', example: '总部平台' })
  platform_name: string;

  @ApiProperty({ description: '设备信息', example: 'Chrome 120.0 / Windows 11' })
  user_agent: string;
}

/**
 * 登录日志响应DTO
 * Requirements: 13.1, 15.1
 */
export class LoginLogResponseDto {
  @ApiProperty({
    description: '登录日志列表',
    type: [LoginLogItemDto]
  })
  items: LoginLogItemDto[];

  @ApiProperty({ description: '总记录数', example: 1250 })
  total: number;

  @ApiProperty({
    description: '元数据信息',
    example: { isDateCorrected: false, isKeywordTruncated: false }
  })
  meta: {
    isDateCorrected: boolean;
    isKeywordTruncated: boolean;
  };
}

/**
 * 操作日志项DTO
 * Requirements: 1.1, 1.2, 1.3
 */
export class OperationLogItemDto {
  @ApiProperty({ description: '日志ID', example: 'log-002' })
  id: string;

  @ApiProperty({ description: '操作时间', example: '2024-01-15 14:20:30' })
  create_time: Date;

  @ApiProperty({ description: '操作人姓名（已转换）', example: '李四' })
  operator_name: string;

  @ApiProperty({ description: '操作模块', example: '用户管理' })
  operation_module: string;

  @ApiProperty({ description: '操作接口路径', example: '/api/v1/users' })
  api_path: string;

  @ApiProperty({ description: '请求方式', example: 'POST' })
  request_method: string;

  @ApiProperty({ description: '操作状态（1=成功，0=失败）', example: 1 })
  operation_status: number;

  @ApiProperty({ description: '操作详细描述', example: '创建用户：张三' })
  operation_message: string;

  @ApiProperty({ description: '操作IP地址', example: '192.168.1.101' })
  request_ip: string;

  @ApiProperty({ description: '所属平台名称（已转换）', example: '总部平台' })
  platform_name: string;

  @ApiProperty({ description: '所属部门名称（已转换）', example: '技术部' })
  dept_name: string;

  @ApiProperty({ description: '所属店铺名称（已转换）', example: '旗舰店' })
  shop_name: string;
}

/**
 * 操作日志响应DTO
 * Requirements: 13.1, 15.1
 */
export class OperationLogResponseDto {
  @ApiProperty({
    description: '操作日志列表',
    type: [OperationLogItemDto]
  })
  items: OperationLogItemDto[];

  @ApiProperty({ description: '总记录数', example: 5680 })
  total: number;

  @ApiProperty({
    description: '元数据信息',
    example: { isDateCorrected: false, isKeywordTruncated: false }
  })
  meta: {
    isDateCorrected: boolean;
    isKeywordTruncated: boolean;
  };
}
