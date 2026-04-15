-- CreateTable: attendance_schedule_history
-- 替代 sys_config 存储排班历史，提供更好的查询性能和数据结构

CREATE TABLE `attendance_schedule_history` (
  `id` VARCHAR(191) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) NOT NULL,
  `is_deleted` INTEGER NOT NULL DEFAULT 0,
  
  -- 基础信息
  `draft_name` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(191) NOT NULL COMMENT 'fairness, coverage',
  `platform_id` VARCHAR(191) NOT NULL,
  `dept_id` VARCHAR(191) NOT NULL,
  
  -- 排班周期
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  
  -- 统计指标
  `total_scheduled` INTEGER NOT NULL DEFAULT 0,
  `warning_count` INTEGER NOT NULL DEFAULT 0,
  `compliance_rate` INTEGER NOT NULL DEFAULT 0,
  `satisfaction_rate` INTEGER NOT NULL DEFAULT 0,
  `fitting_rate` INTEGER NOT NULL DEFAULT 0,
  
  -- 应用信息
  `applied_by` VARCHAR(191) NOT NULL,
  `applied_at` DATETIME(3) NOT NULL,
  `items_count` INTEGER NOT NULL DEFAULT 0,
  
  -- 排班数据（JSON格式存储详细排班信息）
  `schedule_data` JSON NULL,
  
  -- 配置参数（用于预测和分析）
  `config_params` JSON NULL COMMENT '生成时的配置参数',
  
  -- 备注
  `remark` TEXT NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_platform_dept_date` (`platform_id`, `dept_id`, `start_date`, `end_date`),
  INDEX `idx_applied_at` (`applied_at`),
  INDEX `idx_mode` (`mode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: attendance_schedule_prediction
-- 基于历史数据的排班预测表

CREATE TABLE `attendance_schedule_prediction` (
  `id` VARCHAR(191) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) NOT NULL,
  `is_deleted` INTEGER NOT NULL DEFAULT 0,
  
  -- 预测目标
  `platform_id` VARCHAR(191) NOT NULL,
  `dept_id` VARCHAR(191) NOT NULL,
  `predict_date` DATE NOT NULL,
  `shift_name` VARCHAR(191) NOT NULL,
  
  -- 预测结果
  `predicted_demand` INTEGER NOT NULL DEFAULT 0 COMMENT '预测人力需求',
  `confidence_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT '置信度 0-100',
  
  -- 预测依据
  `based_on_history_count` INTEGER NOT NULL DEFAULT 0 COMMENT '基于历史记录数',
  `avg_historical_demand` DECIMAL(10, 2) NULL COMMENT '历史平均需求',
  `trend_factor` DECIMAL(5, 2) NULL COMMENT '趋势因子',
  
  -- 预测元数据
  `prediction_model` VARCHAR(191) NOT NULL DEFAULT 'simple_average' COMMENT '预测模型类型',
  `prediction_params` JSON NULL COMMENT '预测参数',
  
  -- 验证数据（实际应用后回填）
  `actual_demand` INTEGER NULL COMMENT '实际需求',
  `accuracy_rate` DECIMAL(5, 2) NULL COMMENT '准确率',

  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_prediction` (`dept_id`, `predict_date`, `shift_name`, `is_deleted`),
  INDEX `idx_platform_dept_date` (`platform_id`, `dept_id`, `predict_date`),
  INDEX `idx_confidence` (`confidence_score`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
