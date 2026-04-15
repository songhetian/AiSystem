-- 活动表
CREATE TABLE IF NOT EXISTS `biz_activity` (
  `id` varchar(50) NOT NULL COMMENT '活动ID',
  `activity_name` varchar(100) NOT NULL COMMENT '活动名称',
  `activity_type` varchar(50) NOT NULL COMMENT '活动类型（discount/fullcut/gift）',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '关联平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '关联部门ID',
  `shop_id` varchar(50) DEFAULT NULL COMMENT '关联店铺ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `description` text COMMENT '活动描述',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `biz_activity_sort_idx` (`sort`),
  KEY `biz_activity_platform_idx` (`platform_id`),
  KEY `biz_activity_dept_idx` (`dept_id`),
  KEY `biz_activity_shop_idx` (`shop_id`),
  KEY `biz_activity_time_idx` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表';

-- 活动规则表
CREATE TABLE IF NOT EXISTS `biz_activity_rule` (
  `id` varchar(50) NOT NULL COMMENT '规则ID',
  `activity_id` varchar(50) NOT NULL COMMENT '活动ID',
  `rule_name` varchar(100) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(50) NOT NULL COMMENT '规则类型（discount/fullcut/gift）',
  `rule_config` json NOT NULL COMMENT '规则配置',
  `priority` int NOT NULL DEFAULT 3 COMMENT '优先级（1高 2中 3低）',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `biz_activity_rule_activity_idx` (`activity_id`),
  KEY `biz_activity_rule_sort_idx` (`sort`),
  KEY `biz_activity_rule_priority_idx` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动规则表';
