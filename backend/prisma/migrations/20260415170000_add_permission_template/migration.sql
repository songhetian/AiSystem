-- 权限模板表
CREATE TABLE IF NOT EXISTS `sys_permission_template` (
  `id` varchar(50) NOT NULL COMMENT '模板ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  `template_name` varchar(100) NOT NULL COMMENT '模板名称',
  `template_type` varchar(20) NOT NULL COMMENT '模板类型（system/custom）',
  `description` text COMMENT '模板描述',
  `permission_config` json NOT NULL COMMENT '权限配置',
  `is_default` int NOT NULL DEFAULT 0 COMMENT '是否为默认模板',
  `category` varchar(50) DEFAULT NULL COMMENT '分类（部门/岗位）',
  `created_by` varchar(50) DEFAULT NULL COMMENT '创建人',
  `platform_id` varchar(50) DEFAULT NULL COMMENT '平台ID',
  `dept_id` varchar(50) DEFAULT NULL COMMENT '部门ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_permission_template_name_unique` (`template_name`, `is_deleted`),
  KEY `sys_permission_template_type_idx` (`template_type`, `is_deleted`),
  KEY `sys_permission_template_category_idx` (`category`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限模板表';

-- 插入系统默认模板
INSERT INTO `sys_permission_template` (`id`, `template_name`, `template_type`, `description`, `permission_config`, `is_default`, `category`)
VALUES
  ('super_admin_template', '超级管理员模板', 'system', '拥有系统所有权限', '{"type": "all"}', 1, 'system'),
  ('admin_template', '普通管理员模板', 'system', '核心管理权限（用户管理、权限查看、基础配置）', '{"menuIds": [], "buttonIds": []}', 1, 'system'),
  ('operator_template', '操作员模板', 'system', '仅操作权限（无配置、无删除权限）', '{"menuIds": [], "buttonIds": []}', 1, 'system'),
  ('readonly_template', '只读模板', 'system', '仅查看权限（无任何操作、编辑权限）', '{"menuIds": [], "buttonIds": []}', 1, 'system');
