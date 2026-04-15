-- 坐席组表
CREATE TABLE IF NOT EXISTS `service_agent_group` (
  `id` varchar(50) NOT NULL COMMENT '坐席组ID',
  `group_name` varchar(100) NOT NULL COMMENT '坐席组名称',
  `group_code` varchar(50) NOT NULL COMMENT '坐席组编码',
  `description` text COMMENT '描述',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '关联平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '关联部门ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_agent_group_code_unique` (`group_code`, `is_deleted`),
  KEY `service_agent_group_platform_idx` (`platform_id`),
  KEY `service_agent_group_dept_idx` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='坐席组表';

-- 坐席组成员表
CREATE TABLE IF NOT EXISTS `service_agent_group_member` (
  `id` varchar(50) NOT NULL COMMENT '成员ID',
  `group_id` varchar(50) NOT NULL COMMENT '坐席组ID',
  `agent_id` varchar(50) NOT NULL COMMENT '客服ID',
  `agent_name` varchar(100) NOT NULL COMMENT '客服姓名',
  `agent_phone` varchar(20) DEFAULT NULL COMMENT '客服手机号',
  `priority` int NOT NULL DEFAULT 3 COMMENT '优先级（1高 2中 3低）',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态（0禁用 1启用）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `service_agent_group_member_group_idx` (`group_id`),
  KEY `service_agent_group_member_agent_idx` (`agent_id`),
  KEY `service_agent_group_member_sort_idx` (`sort`),
  KEY `service_agent_group_member_priority_idx` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='坐席组成员表';
