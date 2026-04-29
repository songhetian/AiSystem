-- 审批系统数据库表结构增强迁移
-- 基于现有表结构进行扩展和优化

-- 1. 创建审批实例表 (approval_instances) - 替代现有的 approval_request
CREATE TABLE `approval_instances` (
  `id` VARCHAR(30) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` INT NOT NULL DEFAULT 0,
  `template_id` VARCHAR(30) NOT NULL COMMENT '模板ID',
  `applicant_id` VARCHAR(30) NOT NULL COMMENT '申请人ID',
  `title` VARCHAR(200) NOT NULL COMMENT '审批标题',
  `form_data` JSON NOT NULL COMMENT '表单数据JSON',
  `current_node_id` VARCHAR(50) NULL COMMENT '当前节点ID',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/approved/rejected/cancelled',
  `priority` INT NOT NULL DEFAULT 1 COMMENT '优先级：1普通 2紧急 3特急',
  `platform_id` VARCHAR(30) NULL COMMENT '关联平台ID',
  `department_id` VARCHAR(30) NULL COMMENT '关联部门ID',

  PRIMARY KEY (`id`),
  INDEX `idx_template` (`template_id`),
  INDEX `idx_applicant` (`applicant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_platform_dept` (`platform_id`, `department_id`),
  INDEX `idx_create_time` (`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 创建审批记录表 (approval_records)
CREATE TABLE `approval_records` (
  `id` VARCHAR(30) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `instance_id` VARCHAR(30) NOT NULL COMMENT '审批实例ID',
  `node_id` VARCHAR(50) NOT NULL COMMENT '节点ID',
  `approver_id` VARCHAR(30) NOT NULL COMMENT '审批人ID',
  `action` VARCHAR(20) NOT NULL COMMENT '操作：approve/reject/transfer',
  `comment` TEXT NULL COMMENT '审批意见',
  `attachments` JSON NULL COMMENT '附件信息',
  `process_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '处理时间',

  PRIMARY KEY (`id`),
  INDEX `idx_instance` (`instance_id`),
  INDEX `idx_approver` (`approver_id`),
  INDEX `idx_node` (`node_id`),
  INDEX `idx_process_time` (`process_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. 创建收支记录表 (financial_records) - 统一管理收支
CREATE TABLE `financial_records` (
  `id` VARCHAR(30) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` INT NOT NULL DEFAULT 0,
  `type` VARCHAR(20) NOT NULL COMMENT '类型：income/expense',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `source` VARCHAR(100) NULL COMMENT '来源/用途',
  `category` VARCHAR(50) NULL COMMENT '分类',
  `description` TEXT NULL COMMENT '描述',
  `related_id` VARCHAR(30) NULL COMMENT '关联业务ID（报销/采购）',
  `related_type` VARCHAR(20) NULL COMMENT '关联类型：reimbursement/purchase/manual',
  `platform_id` VARCHAR(30) NULL COMMENT '关联平台ID',
  `department_id` VARCHAR(30) NULL COMMENT '关联部门ID',
  `operator_id` VARCHAR(30) NOT NULL COMMENT '操作人ID',

  PRIMARY KEY (`id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_amount` (`amount`),
  INDEX `idx_related` (`related_id`, `related_type`),
  INDEX `idx_platform_dept` (`platform_id`, `department_id`),
  INDEX `idx_create_time` (`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. 增强现有 approval_template 表结构
ALTER TABLE `approval_template`
ADD COLUMN `workflow_config` JSON NULL COMMENT '工作流配置JSON' AFTER `form_fields`,
ADD COLUMN `creator_id` VARCHAR(30) NULL COMMENT '创建人ID' AFTER `workflow_config`,
MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled/disabled';

-- 为 approval_template 添加索引
ALTER TABLE `approval_template`
ADD INDEX `idx_type_status` (`type`, `status`),
ADD INDEX `idx_creator` (`creator_id`);

-- 5. 增强现有 fin_reimbursement 表，添加与 approval_instances 的关联
ALTER TABLE `fin_reimbursement`
ADD COLUMN `instance_id` VARCHAR(30) NULL COMMENT '审批实例ID' AFTER `approval_request_id`,
ADD INDEX `idx_instance` (`instance_id`);

-- 6. 增强现有 fin_purchase 表，添加与 approval_instances 的关联
ALTER TABLE `fin_purchase`
ADD COLUMN `instance_id` VARCHAR(30) NULL COMMENT '审批实例ID' AFTER `approval_request_id`,
ADD INDEX `idx_instance` (`instance_id`);

-- 7. 为现有 fin_expense_type 表添加创建人字段
ALTER TABLE `fin_expense_type`
ADD COLUMN `creator_id` VARCHAR(30) NULL COMMENT '创建人ID' AFTER `status`;

-- 8. 创建审批模板表的别名视图，保持向后兼容
CREATE VIEW `approval_templates` AS
SELECT
  `id`,
  `create_time`,
  `update_time`,
  `is_deleted`,
  `name`,
  `type`,
  `description`,
  `form_fields` as `form_config`,
  `workflow_config`,
  `platform_id`,
  `dept_id` as `department_id`,
  `status`,
  `creator_id`
FROM `approval_template`;

-- 9. 创建费用类型表的别名视图，保持向后兼容
CREATE VIEW `expense_types` AS
SELECT
  `id`,
  `create_time`,
  `update_time`,
  `is_deleted`,
  `name`,
  `code`,
  `description`,
  `platform_id`,
  `dept_id` as `department_id`,
  `status`,
  `creator_id`
FROM `fin_expense_type`;

-- 10. 创建报销申请表的别名视图，保持向后兼容
CREATE VIEW `reimbursements` AS
SELECT
  `id`,
  `create_time`,
  `update_time`,
  `is_deleted`,
  `instance_id`,
  `applicant_id`,
  `expense_type_id`,
  `amount`,
  `reason` as `description`,
  `attachment_urls` as `receipts`,
  CASE
    WHEN `status` = 1 THEN 'pending'
    WHEN `status` = 2 THEN 'approved'
    WHEN `status` = 3 THEN 'paid'
    WHEN `status` = 4 THEN 'rejected'
    WHEN `status` = 5 THEN 'cancelled'
    ELSE 'pending'
  END as `status`,
  `paid_at` as `payment_time`,
  `platform_id`,
  `dept_id` as `department_id`
FROM `fin_reimbursement`;

-- 11. 创建采购申请表的别名视图，保持向后兼容
CREATE VIEW `purchases` AS
SELECT
  `id`,
  `create_time`,
  `update_time`,
  `is_deleted`,
  `instance_id`,
  `applicant_id`,
  JSON_UNQUOTE(JSON_EXTRACT(`items`, '$[0].name')) as `item_name`,
  JSON_UNQUOTE(JSON_EXTRACT(`items`, '$[0].quantity')) as `quantity`,
  JSON_UNQUOTE(JSON_EXTRACT(`items`, '$[0].unit_price')) as `unit_price`,
  `total_amount`,
  `reason`,
  CASE
    WHEN `status` = 1 THEN 'pending'
    WHEN `status` = 2 THEN 'approved'
    WHEN `status` = 3 THEN 'completed'
    WHEN `status` = 4 THEN 'rejected'
    WHEN `status` = 5 THEN 'cancelled'
    ELSE 'pending'
  END as `status`,
  `completed_at` as `completion_time`,
  `platform_id`,
  `dept_id` as `department_id`
FROM `fin_purchase`;

-- 12. 创建数据迁移触发器，自动同步数据到新表结构

-- 当 fin_reimbursement 状态变为已打款时，自动创建 financial_records
DELIMITER $$
CREATE TRIGGER `tr_reimbursement_paid`
AFTER UPDATE ON `fin_reimbursement`
FOR EACH ROW
BEGIN
  IF NEW.status = 3 AND OLD.status != 3 THEN
    INSERT INTO `financial_records` (
      `id`, `type`, `amount`, `source`, `category`, `description`,
      `related_id`, `related_type`, `platform_id`, `department_id`, `operator_id`
    ) VALUES (
      CONCAT('fr_', NEW.id),
      'expense',
      NEW.amount,
      '报销支出',
      'reimbursement',
      NEW.reason,
      NEW.id,
      'reimbursement',
      NEW.platform_id,
      NEW.dept_id,
      NEW.applicant_id
    ) ON DUPLICATE KEY UPDATE
      `amount` = NEW.amount,
      `description` = NEW.reason,
      `update_time` = CURRENT_TIMESTAMP(3);
  END IF;
END$$
DELIMITER ;

-- 当 fin_purchase 状态变为已完成时，自动创建 financial_records
DELIMITER $$
CREATE TRIGGER `tr_purchase_completed`
AFTER UPDATE ON `fin_purchase`
FOR EACH ROW
BEGIN
  IF NEW.status = 3 AND OLD.status != 3 THEN
    INSERT INTO `financial_records` (
      `id`, `type`, `amount`, `source`, `category`, `description`,
      `related_id`, `related_type`, `platform_id`, `department_id`, `operator_id`
    ) VALUES (
      CONCAT('fr_', NEW.id),
      'expense',
      COALESCE(NEW.actual_amount, NEW.total_amount),
      '采购支出',
      'purchase',
      NEW.reason,
      NEW.id,
      'purchase',
      NEW.platform_id,
      NEW.dept_id,
      NEW.applicant_id
    ) ON DUPLICATE KEY UPDATE
      `amount` = COALESCE(NEW.actual_amount, NEW.total_amount),
      `description` = NEW.reason,
      `update_time` = CURRENT_TIMESTAMP(3);
  END IF;
END$$
DELIMITER ;

-- 13. 创建索引优化查询性能

-- approval_instances 表的复合索引
ALTER TABLE `approval_instances`
ADD INDEX `idx_status_priority_time` (`status`, `priority`, `create_time`),
ADD INDEX `idx_applicant_status` (`applicant_id`, `status`),
ADD INDEX `idx_template_status` (`template_id`, `status`);

-- approval_records 表的复合索引
ALTER TABLE `approval_records`
ADD INDEX `idx_instance_time` (`instance_id`, `process_time`),
ADD INDEX `idx_approver_action` (`approver_id`, `action`);

-- financial_records 表的复合索引
ALTER TABLE `financial_records`
ADD INDEX `idx_type_time` (`type`, `create_time`),
ADD INDEX `idx_platform_dept_type` (`platform_id`, `department_id`, `type`),
ADD INDEX `idx_related_type_time` (`related_type`, `create_time`);

-- 14. 插入初始化数据

-- 插入默认审批模板类型配置
INSERT INTO `sys_config` (`id`, `config_key`, `config_value`, `remark`) VALUES
('cfg_approval_types', 'approval.template.types', '["reimbursement","purchase","leave","business_trip","general"]', '审批模板类型配置'),
('cfg_approval_status', 'approval.instance.status', '["pending","approved","rejected","cancelled"]', '审批实例状态配置'),
('cfg_approval_actions', 'approval.record.actions', '["approve","reject","transfer"]', '审批操作类型配置')
ON DUPLICATE KEY UPDATE
  `config_value` = VALUES(`config_value`),
  `update_time` = CURRENT_TIMESTAMP(3);

-- 插入默认费用类型（如果不存在）
INSERT IGNORE INTO `fin_expense_type` (`id`, `name`, `code`, `description`, `platform_id`, `status`) VALUES
('exp_travel', '差旅费', 'TRAVEL', '出差相关费用报销', 'default', 1),
('exp_meal', '餐费', 'MEAL', '工作餐费报销', 'default', 1),
('exp_transport', '交通费', 'TRANSPORT', '交通费用报销', 'default', 1),
('exp_office', '办公用品', 'OFFICE', '办公用品采购费用', 'default', 1),
('exp_training', '培训费', 'TRAINING', '员工培训相关费用', 'default', 1);

-- 15. 创建数据完整性约束

-- 确保 approval_instances 的 template_id 引用有效的模板
ALTER TABLE `approval_instances`
ADD CONSTRAINT `fk_approval_instances_template`
FOREIGN KEY (`template_id`) REFERENCES `approval_template`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 确保 approval_records 的 instance_id 引用有效的实例
ALTER TABLE `approval_records`
ADD CONSTRAINT `fk_approval_records_instance`
FOREIGN KEY (`instance_id`) REFERENCES `approval_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- 确保 financial_records 的相关业务ID有效性通过应用层控制
-- （由于 related_type 可能指向不同表，不在数据库层面建立外键约束）

-- 16. 创建统计视图，便于数据分析

-- 审批统计视图
CREATE VIEW `v_approval_statistics` AS
SELECT
  DATE(ai.create_time) as stat_date,
  ai.platform_id,
  ai.department_id,
  at.type as template_type,
  ai.status,
  COUNT(*) as instance_count,
  AVG(TIMESTAMPDIFF(HOUR, ai.create_time,
    COALESCE(
      (SELECT MAX(ar.process_time) FROM approval_records ar WHERE ar.instance_id = ai.id),
      ai.update_time
    )
  )) as avg_process_hours
FROM approval_instances ai
LEFT JOIN approval_template at ON ai.template_id = at.id
WHERE ai.is_deleted = 0
GROUP BY DATE(ai.create_time), ai.platform_id, ai.department_id, at.type, ai.status;

-- 财务统计视图
CREATE VIEW `v_financial_statistics` AS
SELECT
  DATE(fr.create_time) as stat_date,
  fr.platform_id,
  fr.department_id,
  fr.type,
  fr.category,
  COUNT(*) as record_count,
  SUM(fr.amount) as total_amount,
  AVG(fr.amount) as avg_amount
FROM financial_records fr
WHERE fr.is_deleted = 0
GROUP BY DATE(fr.create_time), fr.platform_id, fr.department_id, fr.type, fr.category;

-- 17. 创建存储过程，用于数据迁移和维护

-- 数据迁移存储过程：将现有 approval_request 数据迁移到 approval_instances
DELIMITER $$
CREATE PROCEDURE `sp_migrate_approval_data`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_id, v_template_id, v_applicant_id, v_title, v_platform_id, v_dept_id VARCHAR(50);
  DECLARE v_status, v_form_data VARCHAR(500);
  DECLARE v_create_time, v_update_time DATETIME;

  DECLARE cur CURSOR FOR
    SELECT id, template_id, applicant_id,
           COALESCE(summary, '审批申请') as title,
           status, form_data, platform_id, dept_id,
           create_time, update_time
    FROM approval_request
    WHERE is_deleted = 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO v_id, v_template_id, v_applicant_id, v_title,
                   v_status, v_form_data, v_platform_id, v_dept_id,
                   v_create_time, v_update_time;

    IF done THEN
      LEAVE read_loop;
    END IF;

    -- 插入到新的 approval_instances 表
    INSERT IGNORE INTO approval_instances (
      id, template_id, applicant_id, title, form_data,
      status, platform_id, department_id, create_time, update_time
    ) VALUES (
      v_id, v_template_id, v_applicant_id, v_title,
      COALESCE(v_form_data, '{}'),
      v_status, v_platform_id, v_dept_id, v_create_time, v_update_time
    );

  END LOOP;

  CLOSE cur;

  SELECT CONCAT('迁移完成，共处理 ', ROW_COUNT(), ' 条记录') as result;
END$$
DELIMITER ;

-- 18. 创建清理过期数据的存储过程
DELIMITER $$
CREATE PROCEDURE `sp_cleanup_approval_data`(IN days_to_keep INT)
BEGIN
  DECLARE cleanup_date DATETIME;
  SET cleanup_date = DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

  -- 软删除过期的已完成审批实例
  UPDATE approval_instances
  SET is_deleted = 1, update_time = NOW()
  WHERE status IN ('approved', 'rejected', 'cancelled')
    AND create_time < cleanup_date
    AND is_deleted = 0;

  -- 清理对应的审批记录
  UPDATE approval_records ar
  JOIN approval_instances ai ON ar.instance_id = ai.id
  SET ar.is_deleted = 1
  WHERE ai.is_deleted = 1;

  SELECT CONCAT('清理完成，清理了 ', ROW_COUNT(), ' 条过期数据') as result;
END$$
DELIMITER ;

-- 19. 创建数据备份表
CREATE TABLE `approval_instances_backup` LIKE `approval_instances`;
CREATE TABLE `approval_records_backup` LIKE `approval_records`;
CREATE TABLE `financial_records_backup` LIKE `financial_records`;

-- 20. 插入系统配置，启用审批系统功能
INSERT INTO `sys_config` (`id`, `config_key`, `config_value`, `remark`) VALUES
('cfg_approval_enabled', 'approval.system.enabled', 'true', '审批系统功能开关'),
('cfg_approval_auto_financial', 'approval.auto.financial.record', 'true', '自动创建财务记录开关'),
('cfg_approval_notification', 'approval.notification.enabled', 'true', '审批通知功能开关'),
('cfg_approval_timeout', 'approval.default.timeout.hours', '72', '默认审批超时时间（小时）')
ON DUPLICATE KEY UPDATE
  `config_value` = VALUES(`config_value`),
  `update_time` = CURRENT_TIMESTAMP(3);

-- 迁移完成提示
SELECT '审批系统数据库表结构增强完成！' as migration_status,
       '已创建 approval_instances, approval_records, financial_records 表' as new_tables,
       '已增强现有表结构并创建兼容性视图' as enhancements,
       '已创建触发器实现自动财务记录' as automation,
       '请运行 CALL sp_migrate_approval_data() 迁移现有数据' as next_step;
