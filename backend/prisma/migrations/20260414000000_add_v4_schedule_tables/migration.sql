-- AI排班 V4.0 优化 - 新增表
-- 创建时间: 2026-04-14

-- 1. 异步排班任务队列表
CREATE TABLE IF NOT EXISTS `attendance_schedule_job` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `job_id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `config_params` json DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `progress` int NOT NULL DEFAULT 0,
  `result` json DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `started_at` datetime(3) DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_schedule_job_job_id_key` (`job_id`),
  KEY `attendance_schedule_job_user_status_idx` (`user_id`, `status`, `create_time`),
  KEY `attendance_schedule_job_platform_dept_status_idx` (`platform_id`, `dept_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异步排班任务队列表';

-- 2. AI推荐记录表
CREATE TABLE IF NOT EXISTS `attendance_schedule_recommendation` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `recommendation_type` varchar(191) NOT NULL,
  `confidence_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `recommendations` json NOT NULL,
  `analysis_data` json DEFAULT NULL,
  `applied` int NOT NULL DEFAULT 0,
  `applied_at` datetime(3) DEFAULT NULL,
  `applied_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_schedule_recommendation_platform_dept_type_idx` (`platform_id`, `dept_id`, `recommendation_type`, `create_time`),
  KEY `attendance_schedule_recommendation_confidence_idx` (`confidence_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI推荐记录表';

-- 3. 机器学习模型配置表
CREATE TABLE IF NOT EXISTS `attendance_schedule_ml_model` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shift_name` varchar(191) NOT NULL,
  `model_type` varchar(191) NOT NULL DEFAULT 'simple_moving_average',
  `model_params` json NOT NULL,
  `training_data_count` int NOT NULL DEFAULT 0,
  `accuracy_rate` decimal(5,2) DEFAULT NULL,
  `last_trained_at` datetime(3) NOT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_schedule_ml_model_unique` (`platform_id`, `dept_id`, `shift_name`, `is_deleted`),
  KEY `attendance_schedule_ml_model_type_status_idx` (`model_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器学习模型配置表';

-- 4. 多目标优化结果表
CREATE TABLE IF NOT EXISTS `attendance_schedule_optimization_result` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `solution_id` varchar(191) NOT NULL,
  `params` json NOT NULL,
  `objectives` json NOT NULL,
  `total_score` decimal(10,2) NOT NULL,
  `is_pareto_optimal` int NOT NULL DEFAULT 0,
  `schedule_data` json DEFAULT NULL,
  `applied` int NOT NULL DEFAULT 0,
  `applied_at` datetime(3) DEFAULT NULL,
  `applied_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_schedule_optimization_result_platform_dept_idx` (`platform_id`, `dept_id`, `create_time`),
  KEY `attendance_schedule_optimization_result_score_idx` (`total_score`),
  KEY `attendance_schedule_optimization_result_pareto_idx` (`is_pareto_optimal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多目标优化结果表';

-- 5. 实时调整记录表
CREATE TABLE IF NOT EXISTS `attendance_schedule_realtime_adjustment` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `adjustment_date` date NOT NULL,
  `adjustment_type` varchar(191) NOT NULL,
  `original_employee_id` varchar(191) DEFAULT NULL,
  `new_employee_id` varchar(191) DEFAULT NULL,
  `shift_name` varchar(191) NOT NULL,
  `reason` text NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `applied_at` datetime(3) DEFAULT NULL,
  `applied_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_schedule_realtime_adjustment_platform_dept_date_idx` (`platform_id`, `dept_id`, `adjustment_date`, `status`),
  KEY `attendance_schedule_realtime_adjustment_type_idx` (`adjustment_type`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实时调整记录表';
