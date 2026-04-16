-- 权限控制配置表
CREATE TABLE IF NOT EXISTS `sys_permission_control_config` (
  `id` varchar(50) NOT NULL COMMENT '配置ID',
  `resource_type` varchar(20) NOT NULL COMMENT '资源类型（module/menu/button）',
  `resource_id` varchar(50) NOT NULL COMMENT '资源ID',
  `resource_name` varchar(100) NOT NULL COMMENT '资源名称',
  `need_control` int NOT NULL DEFAULT 1 COMMENT '是否需要权限控制（1需要 0不需要）',
  `exception_roles` json DEFAULT NULL COMMENT '例外角色列表',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_permission_control_config_unique` (`resource_type`, `resource_id`, `is_deleted`),
  KEY `sys_permission_control_config_type_idx` (`resource_type`),
  KEY `sys_permission_control_config_need_idx` (`need_control`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限控制配置表';
