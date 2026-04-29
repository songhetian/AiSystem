import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray } from 'class-validator';

export class ProcessApprovalInstanceDto {
  @ApiProperty({
    description: '节点ID',
    example: 'node-manager-approval',
  })
  @IsString()
  @IsNotEmpty()
  nodeId: string;

  @ApiProperty({
    description: '操作类型',
    enum: ['approve', 'reject', 'transfer', 'delegate'],
    example: 'approve',
  })
  @IsString()
  @IsIn(['approve', 'reject', 'transfer', 'delegate'])
  action: 'approve' | 'reject' | 'transfer' | 'delegate';

  @ApiPropertyOptional({
    description: '审批意见',
    example: '同意申请',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: '转审目标用户ID（action为transfer时必填）',
    example: 'user-456',
  })
  @IsOptional()
  @IsString()
  transferTo?: string;

  @ApiPropertyOptional({
    description: '委托目标用户ID（action为delegate时必填）',
    example: 'user-789',
  })
  @IsOptional()
  @IsString()
  delegateTo?: string;

  @ApiPropertyOptional({
    description: '附件列表',
    example: ['file1.pdf', 'file2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
