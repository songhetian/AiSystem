# 审批系统数据库设计文档

## 概述

本文档描述了审批系统的完整数据库表结构设计，包括新增表、增强表和数据迁移策略。

## 数据库表结构

### 核心表

#### 1. approval_instances (审批实例表)
新增的核心审批表，替代原有的 `approval_request` 表，提供更完整的审批实例管理。

```sql
CREATE TABLE `approval_instances` (
  `id` VARCHAR(30) PRIMARY KEY,
  `create_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` INT DEFAULT 0,
  `template_id` VARCHAR(30) NOT NULL COMMENT '模板ID',
  `applicant_id` VARCHAR(30) NOT NULL COMMENT '申请人ID',
  `title` VARCHAR(200) NOT NULL COMMENT '审批标题',
  `form_data` JSON NOT NULL COMMENT '表单数据JSON',
  `current_node_id` VARCHAR(50) COMMENT '当前节点ID',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/approved/rejected/cancelled',
  `priority` INT DEFAULT 1 COMMENT '优先级：1普通 2紧急 3特急',
  `platform_id` VARCHAR(30) COMMENT '关联平台ID',
  `department_id` VARCHAR(30) COMMENT '关联部门ID'
);
```

**字段说明:**
- `template_id`: 关联审批模板
- `applicant_id`: 申请人用户ID
- `title`: 审批标题，便于识别
- `form_data`: 表单数据，JSON格式存储
- `current_node_id`: 当前审批节点ID
- `status`: 审批状态
- `priority`: 优先级，影响处理顺序

#### 2. approval_records (审批记录表)
记录每个审批节点的处理情况，提供完整的审批轨迹。

```sql
CREATE TABLE `approval_records` (
  `id` VARCHAR(30) PRIMARY KEY,
  `create_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `instance_id` VARCHAR(30) NOT NULL COMMENT '审批实例ID',
  `node_id` VARCHAR(50) NOT NULL COMMENT '节点ID',
  `approver_id` VARCHAR(30) NOT NULL COMMENT '审批人ID',
  `action` VARCHAR(20) NOT NULL COMMENT '操作：approve/reject/transfer',
  `comment` TEXT COMMENT '审批意见',
  `attachments` JSON COMMENT '附件信息',
  `process_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '处理时间'
);
```

**字段说明:**
- `instance_id`: 关联审批实例
- `node_id`: 审批节点ID
- `approver_id`: 审批人用户ID
- `action`: 审批操作类型
- `comment`: 审批意见
- `attachments`: 附件信息JSON

#### 3. financial_records (收支记录表)
统一管理所有收支记录，自动关联报销和采购业务。

```sql
CREATE TABLE `financial_records` (
  `id` VARCHAR(30) PRIMARY KEY,
  `create_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` INT DEFAULT 0,
  `type` VARCHAR(20) NOT NULL COMMENT '类型：income/expense',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `source` VARCHAR(100) COMMENT '来源/用途',
  `category` VARCHAR(50) COMMENT '分类',
  `description` TEXT COMMENT '描述',
  `related_id` VARCHAR(30) COMMENT '关联业务ID（报销/采购）',
  `related_type` VARCHAR(20) COMMENT '关联类型：reimbursement/purchase/manual',
  `platform_id` VARCHAR(30) COMMENT '关联平台ID',
  `department_id` VARCHAR(30) COMMENT '关联部门ID',
  `operator_id` VARCHAR(30) NOT NULL COMMENT '操作人ID'
);
```

**字段说明:**
- `type`: 收支类型 (income/expense)
- `amount`: 金额
- `related_id`: 关联的业务记录ID
- `related_type`: 关联业务类型
- `operator_id`: 操作人ID

### 增强表

#### 1. approval_template (审批模板表) - 增强
在现有表基础上增加字段：

```sql
ALTER TABLE `approval_template`
ADD COLUMN `workflow_config` JSON COMMENT '工作流配置JSON',
ADD COLUMN `creator_id` VARCHAR(30) COMMENT '创建人ID';
```

**新增字段说明:**
- `workflow_config`: 工作流配置，包含超时设置、通知配置等
- `creator_id`: 模板创建人ID

#### 2. fin_reimbursement (报销申请表) - 增强
添加与新审批实例的关联：

```sql
ALTER TABLE `fin_reimbursement`
ADD COLUMN `instance_id` VARCHAR(30) COMMENT '审批实例ID';
```

#### 3. fin_purchase (采购申请表) - 增强
添加与新审批实例的关联：

```sql
ALTER TABLE `fin_purchase`
ADD COLUMN `instance_id` VARCHAR(30) COMMENT '审批实例ID';
```

#### 4. fin_expense_type (费用类型表) - 增强
添加创建人字段：

```sql
ALTER TABLE `fin_expense_type`
ADD COLUMN `creator_id` VARCHAR(30) COMMENT '创建人ID';
```

## 索引设计

### 性能优化索引

```sql
-- approval_instances 表索引
CREATE INDEX idx_template ON approval_instances(template_id);
CREATE INDEX idx_applicant ON approval_instances(applicant_id);
CREATE INDEX idx_status ON approval_instances(status);
CREATE INDEX idx_platform_dept ON approval_instances(platform_id, department_id);
CREATE INDEX idx_create_time ON approval_instances(create_time);
CREATE INDEX idx_status_priority_time ON approval_instances(status, priority, create_time);

-- approval_records 表索引
CREATE INDEX idx_instance ON approval_records(instance_id);
CREATE INDEX idx_approver ON approval_records(approver_id);
CREATE INDEX idx_node ON approval_records(node_id);
CREATE INDEX idx_process_time ON approval_records(process_time);

-- financial_records 表索引
CREATE INDEX idx_type ON financial_records(type);
CREATE INDEX idx_amount ON financial_records(amount);
CREATE INDEX idx_related ON financial_records(related_id, related_type);
CREATE INDEX idx_platform_dept ON financial_records(platform_id, department_id);
CREATE INDEX idx_create_time ON financial_records(create_time);
```

## 数据关系

### 主要关联关系

```
approval_template (1) -----> (N) approval_instances
approval_instances (1) -----> (N) approval_records
approval_instances (1) -----> (N) fin_reimbursement
approval_instances (1) -----> (N) fin_purchase
fin_expense_type (1) -----> (N) fin_reimbursement
```

### 外键约束

```sql
-- 审批实例关联模板
ALTER TABLE approval_instances
ADD CONSTRAINT fk_approval_instances_template
FOREIGN KEY (template_id) REFERENCES approval_template(id);

-- 审批记录关联实例
ALTER TABLE approval_records
ADD CONSTRAINT fk_approval_records_instance
FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE;
```

## 兼容性视图

为保持向后兼容，创建了以下视图：

### 1. approval_templates 视图
```sql
CREATE VIEW approval_templates AS
SELECT
  id, create_time, update_time, is_deleted, name, type, description,
  form_fields as form_config, workflow_config, platform_id,
  dept_id as department_id, status, creator_id
FROM approval_template;
```

### 2. expense_types 视图
```sql
CREATE VIEW expense_types AS
SELECT
  id, create_time, update_time, is_deleted, name, code, description,
  platform_id, dept_id as department_id, status, creator_id
FROM fin_expense_type;
```

### 3. reimbursements 视图
```sql
CREATE VIEW reimbursements AS
SELECT
  id, create_time, update_time, is_deleted, instance_id, applicant_id,
  expense_type_id, amount, reason as description, attachment_urls as receipts,
  CASE
    WHEN status = 1 THEN 'pending'
    WHEN status = 2 THEN 'approved'
    WHEN status = 3 THEN 'paid'
    WHEN status = 4 THEN 'rejected'
    WHEN status = 5 THEN 'cancelled'
  END as status,
  paid_at as payment_time, platform_id, dept_id as department_id
FROM fin_reimbursement;
```

### 4. purchases 视图
```sql
CREATE VIEW purchases AS
SELECT
  id, create_time, update_time, is_deleted, instance_id, applicant_id,
  JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].name')) as item_name,
  JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].quantity')) as quantity,
  JSON_UNQUOTE(JSON_EXTRACT(items, '$[0].unit_price')) as unit_price,
  total_amount, reason,
  CASE
    WHEN status = 1 THEN 'pending'
    WHEN status = 2 THEN 'approved'
    WHEN status = 3 THEN 'completed'
    WHEN status = 4 THEN 'rejected'
    WHEN status = 5 THEN 'cancelled'
  END as status,
  completed_at as completion_time, platform_id, dept_id as department_id
FROM fin_purchase;
```

## 自动化触发器

### 1. 报销打款触发器
当报销状态变为已打款时，自动创建财务记录：

```sql
CREATE TRIGGER tr_reimbursement_paid
AFTER UPDATE ON fin_reimbursement
FOR EACH ROW
BEGIN
  IF NEW.status = 3 AND OLD.status != 3 THEN
    INSERT INTO financial_records (
      id, type, amount, source, category, description,
      related_id, related_type, platform_id, department_id, operator_id
    ) VALUES (
      CONCAT('fr_', NEW.id), 'expense', NEW.amount, '报销支出',
      'reimbursement', NEW.reason, NEW.id, 'reimbursement',
      NEW.platform_id, NEW.dept_id, NEW.applicant_id
    );
  END IF;
END;
```

### 2. 采购完成触发器
当采购状态变为已完成时，自动创建财务记录：

```sql
CREATE TRIGGER tr_purchase_completed
AFTER UPDATE ON fin_purchase
FOR EACH ROW
BEGIN
  IF NEW.status = 3 AND OLD.status != 3 THEN
    INSERT INTO financial_records (
      id, type, amount, source, category, description,
      related_id, related_type, platform_id, department_id, operator_id
    ) VALUES (
      CONCAT('fr_', NEW.id), 'expense',
      COALESCE(NEW.actual_amount, NEW.total_amount), '采购支出',
      'purchase', NEW.reason, NEW.id, 'purchase',
      NEW.platform_id, NEW.dept_id, NEW.applicant_id
    );
  END IF;
END;
```

## 统计视图

### 1. 审批统计视图
```sql
CREATE VIEW v_approval_statistics AS
SELECT
  DATE(ai.create_time) as stat_date,
  ai.platform_id, ai.department_id, at.type as template_type,
  ai.status, COUNT(*) as instance_count,
  AVG(TIMESTAMPDIFF(HOUR, ai.create_time,
    COALESCE((SELECT MAX(ar.process_time) FROM approval_records ar WHERE ar.instance_id = ai.id), ai.update_time)
  )) as avg_process_hours
FROM approval_instances ai
LEFT JOIN approval_template at ON ai.template_id = at.id
WHERE ai.is_deleted = 0
GROUP BY DATE(ai.create_time), ai.platform_id, ai.department_id, at.type, ai.status;
```

### 2. 财务统计视图
```sql
CREATE VIEW v_financial_statistics AS
SELECT
  DATE(fr.create_time) as stat_date,
  fr.platform_id, fr.department_id, fr.type, fr.category,
  COUNT(*) as record_count, SUM(fr.amount) as total_amount, AVG(fr.amount) as avg_amount
FROM financial_records fr
WHERE fr.is_deleted = 0
GROUP BY DATE(fr.create_time), fr.platform_id, fr.department_id, fr.type, fr.category;
```

## 存储过程

### 1. 数据迁移存储过程
```sql
CALL sp_migrate_approval_data();
```
将现有 `approval_request` 数据迁移到新的 `approval_instances` 表。

### 2. 数据清理存储过程
```sql
CALL sp_cleanup_approval_data(90); -- 清理90天前的数据
```
清理过期的审批数据，保持数据库性能。

## 初始化数据

### 默认费用类型
- 差旅费 (TRAVEL)
- 餐费 (MEAL)
- 交通费 (TRANSPORT)
- 办公用品 (OFFICE)
- 培训费 (TRAINING)
- 通讯费 (COMMUNICATION)

### 默认审批模板
- 报销申请模板 (reimbursement)
- 采购申请模板 (purchase)
- 请假申请模板 (leave)

### 系统配置
- 审批系统功能开关
- 自动财务记录开关
- 通知功能开关
- 默认超时时间配置

## 迁移步骤

### 1. 执行数据库迁移
```bash
# 运行迁移脚本
npx prisma migrate dev --name approval_system_enhancement

# 或者直接执行SQL文件
mysql -u username -p database_name < migrations/20250127000000_approval_system_enhancement/migration.sql
```

### 2. 生成Prisma客户端
```bash
npx prisma generate
```

### 3. 运行数据初始化
```bash
# 运行种子脚本
npx ts-node prisma/seed-approval-system.ts

# 或者在应用中调用
import { seedApprovalSystem } from './prisma/seed-approval-system';
await seedApprovalSystem();
```

### 4. 数据迁移（可选）
```sql
-- 迁移现有审批数据
CALL sp_migrate_approval_data();
```

## 性能考虑

### 1. 索引优化
- 为常用查询字段创建索引
- 复合索引优化多条件查询
- 定期分析索引使用情况

### 2. 数据分区
对于大数据量场景，可考虑按时间分区：
```sql
-- 按月分区示例
ALTER TABLE approval_instances
PARTITION BY RANGE (YEAR(create_time) * 100 + MONTH(create_time)) (
  PARTITION p202501 VALUES LESS THAN (202502),
  PARTITION p202502 VALUES LESS THAN (202503),
  -- ...
);
```

### 3. 数据归档
定期归档历史数据到备份表：
```sql
-- 创建归档表
CREATE TABLE approval_instances_archive LIKE approval_instances;

-- 归档数据
INSERT INTO approval_instances_archive
SELECT * FROM approval_instances
WHERE create_time < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

## 安全考虑

### 1. 数据权限
- 基于平台和部门的数据隔离
- 审批人权限验证
- 敏感数据加密存储

### 2. 审计日志
- 所有操作记录到系统日志
- 关键操作需要审批轨迹
- 数据变更历史追踪

### 3. 备份策略
- 定期数据库备份
- 关键表实时备份
- 灾难恢复预案

## 监控指标

### 1. 性能指标
- 查询响应时间
- 数据库连接数
- 索引命中率

### 2. 业务指标
- 审批处理时长
- 审批通过率
- 系统使用率

### 3. 告警设置
- 长时间未处理审批
- 系统异常操作
- 数据异常变化

## 总结

本数据库设计方案：

1. **完整性**: 覆盖审批系统所有功能需求
2. **扩展性**: 支持多种审批类型和自定义流程
3. **兼容性**: 保持与现有系统的兼容
4. **性能**: 优化索引和查询性能
5. **安全性**: 完善的权限控制和审计机制

通过这套数据库设计，可以支撑企业级审批系统的各种业务场景，并为后续功能扩展提供良好的基础。
