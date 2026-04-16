-- 系统配置表
CREATE TABLE IF NOT EXISTS `sys_config` (
  `id` varchar(50) NOT NULL COMMENT '配置ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text NOT NULL COMMENT '配置值',
  `config_type` varchar(20) NOT NULL COMMENT '配置类型（string/number/boolean/json）',
  `description` varchar(200) DEFAULT NULL COMMENT '配置描述',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_config_key_unique` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入全局权限控制开关配置
INSERT INTO `sys_config` (`id`, `config_key`, `config_value`, `config_type`, `description`)
VALUES ('global_permission_control', 'global_permission_control', '1', 'boolean', '全局权限控制开关（1开启 0关闭）');
