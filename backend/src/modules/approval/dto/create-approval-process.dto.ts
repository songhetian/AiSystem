import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessVariableDto {
  @ApiProperty({ description: '变量名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '变量类型', enum: ['string', 'number', 'boolean', 'date', 'array', 'object'] })
  @IsEnum(['string', 'number', 'boolean', 'date', 'array', 'object'])
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

  @ApiPropertyOptional({ description: '默认值' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: '变量描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否必填' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class NotificationSettingsDto {
  @ApiPropertyOptional({ description: '启用邮件通知' })
  @IsOptional()
  @IsBoolean()
  enableEmail?: boolean;

  @ApiPropertyOptional({ description: '启用短信通知' })
  @IsOptional()
  @IsBoolean()
  enableSms?: boolean;

  @ApiPropertyOptional({ description: '启用WebSocket通知' })
  @IsOptional()
  @IsBoolean()
  enableWebSocket?: boolean;

  @ApiPropertyOptional({ description: '提醒间隔(小时)', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  reminderIntervals?: number[];

  @ApiPropertyOptional({ description: '升级延迟(小时)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationDelay?: number;
}

export class EscalationRuleDto {
  @ApiProperty({ description: '节点ID' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: '超时时间(小时)' })
  @IsNumber()
  @Min(1)
  @Max(720)
  timeoutHours: number;

  @ApiProperty({ description: '升级类型', enum: ['manager', 'admin', 'specific'] })
  @IsEnum(['manager', 'admin', 'specific'])
  escalateTo: 'manager' | 'admin' | 'specific';

  @ApiPropertyOptional({ description: '目标用户ID' })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({ description: '目标角色代码' })
  @IsOptional()
  @IsString()
  targetRoleCode?: string;
}

export class ProcessSettingsDto {
  @ApiPropertyOptional({ description: '允许撤回' })
  @IsOptional()
  @IsBoolean()
  allowRecall?: boolean;

  @ApiPropertyOptional({ description: '允许委托' })
  @IsOptional()
  @IsBoolean()
  allowDelegate?: boolean;

  @ApiPropertyOptional({ description: '允许转审' })
  @IsOptional()
  @IsBoolean()
  allowTransfer?: boolean;

  @ApiPropertyOptional({ description: '最大超时时间(小时)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8760)
  maxTimeout?: number;

  @ApiPropertyOptional({ description: '超时自动审批' })
  @IsOptional()
  @IsBoolean()
  autoApproveTimeout?: boolean;

  @ApiPropertyOptional({ description: '通知设置' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  @ApiPropertyOptional({ description: '升级规则', type: [EscalationRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationRuleDto)
  escalationRules?: EscalationRuleDto[];
}

export class WorkflowApproverDto {
  @ApiProperty({ description: '审批人ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '审批人姓名' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '审批人角色' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class WorkflowConditionDto {
  @ApiProperty({ description: '字段名' })
  @IsString()
  field: string;

  @ApiProperty({ description: '操作符', enum: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'startsWith', 'endsWith', 'in', 'notIn'] })
  @IsEnum(['>', '<', '>=', '<=', '==', '!=', 'contains', 'startsWith', 'endsWith', 'in', 'notIn'])
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';

  @ApiProperty({ description: '比较值' })
  value: any;

  @ApiPropertyOptional({ description: '逻辑操作符', enum: ['and', 'or'] })
  @IsOptional()
  @IsEnum(['and', 'or'])
  logicalOperator?: 'and' | 'or';
}

export class WorkflowNodeDto {
  @ApiProperty({ description: '节点ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '节点名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '节点类型', enum: ['approval', 'branch', 'cc', 'end', 'start'] })
  @IsEnum(['approval', 'branch', 'cc', 'end', 'start'])
  type: 'approval' | 'branch' | 'cc' | 'end' | 'start';

  @ApiPropertyOptional({ description: '审批人列表', type: [WorkflowApproverDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowApproverDto)
  approvers?: WorkflowApproverDto[];

  @ApiPropertyOptional({ description: '条件表达式' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: '条件列表', type: [WorkflowConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @ApiPropertyOptional({ description: '审批模式', enum: ['and', 'or'] })
  @IsOptional()
  @IsEnum(['and', 'or'])
  mode?: 'and' | 'or';

  @ApiPropertyOptional({ description: '超时时间(小时)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(720)
  timeout?: number;

  @ApiPropertyOptional({ description: '自动审批' })
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @ApiPropertyOptional({ description: '跳过条件' })
  @IsOptional()
  @IsString()
  skipCondition?: string;

  @ApiPropertyOptional({ description: '下一个节点ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextNodes?: string[];

  @ApiPropertyOptional({ description: '节点描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '节点位置' })
  @IsOptional()
  @IsObject()
  position?: { x: number; y: number };
}

export class CreateApprovalProcessDto {
  @ApiProperty({ description: '流程名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '流程描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '流程节点', type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @ApiPropertyOptional({ description: '流程变量', type: [ProcessVariableDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessVariableDto)
  variables?: ProcessVariableDto[];

  @ApiPropertyOptional({ description: '流程设置' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessSettingsDto)
  settings?: ProcessSettingsDto;

  @ApiPropertyOptional({ description: '流程状态', enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @ApiPropertyOptional({ description: '关联模板ID' })
  @IsOptional()
  @IsString()
  templateId?: string;
}
