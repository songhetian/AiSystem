-- 接口监控配置表
CREATE TABLE IF NOT EXISTS `knowledge_interface_monitor` (
  `id` varchar(50) NOT NULL COMMENT '监控配置ID',
  `interface_id` varchar(50) NOT NULL COMMENT '接口ID（关联sys_api_permission）',
  `interface_name` varchar(200) NOT NULL COMMENT '接口名称',
  `interface_path` varchar(500) NOT NULL COMMENT '接口路径',
  `monitor_fields` json NOT NULL COMMENT '监控字段配置',
  `priority` int NOT NULL DEFAULT 3 COMMENT '优先级（1高 2中 3低）',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '关联平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '关联部门ID',
  `shop_id` varchar(50) DEFAULT NULL COMMENT '关联店铺ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `knowledge_interface_monitor_interface_idx` (`interface_id`),
  KEY `knowledge_interface_monitor_sort_idx` (`sort`),
  KEY `knowledge_interface_monitor_platform_idx` (`platform_id`),
  KEY `knowledge_interface_monitor_dept_idx` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库接口监控配置表';

-- 接口监控数据表
CREATE TABLE IF NOT EXISTS `knowledge_interface_monitor_data` (
  `id` varchar(50) NOT NULL COMMENT '监控数据ID',
  `monitor_id` varchar(50) NOT NULL COMMENT '监控配置ID',
  `interface_id` varchar(50) NOT NULL COMMENT '接口ID',
  `response_time` int NOT NULL COMMENT '响应时间（毫秒）',
  `success_rate` decimal(5,2) NOT NULL COMMENT '成功率',
  `error_count` int NOT NULL DEFAULT 0 COMMENT '错误次数',
  `error_codes` json DEFAULT NULL COMMENT '错误码分布',
  `data_volume` int NOT NULL DEFAULT 0 COMMENT '返回数据量',
  `monitor_time` datetime NOT NULL COMMENT '监控时间',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '关联平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '关联部门ID',
  `shop_id` varchar(50) DEFAULT NULL COMMENT '关联店铺ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `knowledge_interface_monitor_data_monitor_idx` (`monitor_id`),
  KEY `knowledge_interface_monitor_data_time_idx` (`monitor_time`),
  KEY `knowledge_interface_monitor_data_platform_idx` (`platform_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库接口监控数据表';

-- 接口监控定时任务配置表
CREATE TABLE IF NOT EXISTS `knowledge_interface_monitor_schedule` (
  `id` varchar(50) NOT NULL COMMENT '定时任务ID',
  `monitor_id` varchar(50) NOT NULL COMMENT '监控配置ID',
  `schedule_type` varchar(50) NOT NULL COMMENT '定时类型（hourly/daily/weekly/monthly）',
  `schedule_time` varchar(50) NOT NULL COMMENT '定时时间',
  `retention_days` int NOT NULL DEFAULT 90 COMMENT '数据保留天数',
  `notify_users` json DEFAULT NULL COMMENT '通知用户列表',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `last_run_time` datetime DEFAULT NULL COMMENT '上次执行时间',
  `next_run_time` datetime DEFAULT NULL COMMENT '下次执行时间',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '关联平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '关联部门ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `knowledge_interface_monitor_schedule_monitor_idx` (`monitor_id`),
  KEY `knowledge_interface_monitor_schedule_next_idx` (`next_run_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库接口监控定时任务配置表';
