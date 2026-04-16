-- AiSystem MySQL schema initialization script
-- Compatible with MySQL 8.x
-- This file only creates table structures and comments.

CREATE TABLE IF NOT EXISTS `sys_config` (
  `id` varchar(191) NOT NULL COMMENT '配置主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `config_key` varchar(191) NOT NULL COMMENT '配置键名',
  `config_value` text NOT NULL COMMENT '配置内容',
  `remark` text DEFAULT NULL COMMENT '备注信息',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_config_config_key_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统全局配置表';

CREATE TABLE IF NOT EXISTS `sys_external_api_key` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `service_type` varchar(128) NOT NULL,
  `api_key` varchar(512) NOT NULL,
  `api_secret` varchar(512) DEFAULT NULL,
  `endpoint` varchar(512) DEFAULT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sys_external_api_key_lookup_idx` (`platform_id`, `dept_id`, `service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部 API 凭据管理';

CREATE TABLE IF NOT EXISTS `sys_api_mapping` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `source_name` varchar(191) NOT NULL,
  `api_endpoint` varchar(191) NOT NULL,
  `method` varchar(32) NOT NULL DEFAULT 'GET',
  `mapping_json` json NOT NULL,
  `platform_id` varchar(191) NOT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sys_api_mapping_platform_source_idx` (`platform_id`, `source_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部数据集成映射配置';

CREATE TABLE IF NOT EXISTS `fin_expense_type` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fin_expense_type_code_platform_key` (`code`, `platform_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='费用类型管理';

CREATE TABLE IF NOT EXISTS `fin_reimbursement` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `reim_no` varchar(191) NOT NULL,
  `expense_type_id` varchar(191) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `attachment_urls` json DEFAULT NULL,
  `applicant_id` varchar(191) NOT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `approval_request_id` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1 COMMENT '1:审批中, 2:待打款, 3:已打款, 4:已驳回, 5:已撤回',
  `paid_at` datetime(3) DEFAULT NULL,
  `pay_method` varchar(191) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fin_reimbursement_reim_no_key` (`reim_no`),
  KEY `fin_reimbursement_platform_dept_status_idx` (`platform_id`, `dept_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报销申请表';

CREATE TABLE IF NOT EXISTS `fin_purchase` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `purchase_no` varchar(191) NOT NULL,
  `items` json NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `actual_amount` decimal(10,2) DEFAULT NULL,
  `reason` text NOT NULL,
  `attachment_urls` json DEFAULT NULL,
  `applicant_id` varchar(191) NOT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `approval_request_id` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1 COMMENT '1:审批中, 2:待采购, 3:已完成, 4:已驳回, 5:已取消',
  `supplier_info` text DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fin_purchase_purchase_no_key` (`purchase_no`),
  KEY `fin_purchase_platform_dept_status_idx` (`platform_id`, `dept_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采购申请表';

CREATE TABLE IF NOT EXISTS `fin_cash_record` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `type` int NOT NULL COMMENT '1: 收入, 2: 支出',
  `amount` decimal(10,2) NOT NULL,
  `source` varchar(191) NOT NULL,
  `biz_id` varchar(191) DEFAULT NULL,
  `biz_type` varchar(191) DEFAULT NULL,
  `biz_no` varchar(191) DEFAULT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `operator_id` varchar(191) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `modify_log` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fin_cash_record_platform_dept_type_idx` (`platform_id`, `dept_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收支明细记录';

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` varchar(191) NOT NULL COMMENT '用户主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `username` varchar(191) NOT NULL COMMENT '登录用户名，系统内唯一',
  `password` varchar(191) NOT NULL COMMENT '登录密码，建议存储哈希值',
  `name` varchar(191) NOT NULL COMMENT '用户姓名或显示名称',
  `phone` varchar(191) DEFAULT NULL COMMENT '手机号',
  `email` varchar(191) DEFAULT NULL COMMENT '邮箱地址',
  `status` int NOT NULL DEFAULT 1 COMMENT '用户状态，1 启用，0 禁用',
  `last_login_time` datetime(3) DEFAULT NULL COMMENT '最近一次登录时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_user_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表，存储登录账号与基础归属信息';

CREATE TABLE IF NOT EXISTS `sys_role` (
  `id` varchar(191) NOT NULL COMMENT '角色主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `role_name` varchar(191) NOT NULL COMMENT '角色名称',
  `role_code` varchar(191) NOT NULL COMMENT '角色编码，系统内唯一',
  `description` varchar(191) DEFAULT NULL COMMENT '角色描述',
  `status` int NOT NULL DEFAULT 1 COMMENT '角色状态，1 启用，0 禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_role_code_key` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色表，定义权限角色';

CREATE TABLE IF NOT EXISTS `sys_menu` (
  `id` varchar(191) NOT NULL COMMENT '菜单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `menu_name` varchar(191) NOT NULL COMMENT '菜单名称',
  `menu_code` varchar(191) NOT NULL COMMENT '菜单编码，系统内唯一',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '父级菜单 ID，空表示顶级菜单',
  `icon` varchar(191) DEFAULT NULL COMMENT '菜单图标标识',
  `route` varchar(191) DEFAULT NULL COMMENT '前端路由地址，系统内唯一',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  `type` int NOT NULL COMMENT '菜单类型',
  `status` int NOT NULL DEFAULT 1 COMMENT '菜单状态，1 启用，0 禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_menu_menu_code_key` (`menu_code`),
  UNIQUE KEY `sys_menu_route_key` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统菜单表，定义导航、目录与页面权限节点';

CREATE TABLE IF NOT EXISTS `sys_button` (
  `id` varchar(191) NOT NULL COMMENT '按钮主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `button_name` varchar(191) NOT NULL COMMENT '按钮名称',
  `button_code` varchar(191) NOT NULL COMMENT '按钮编码，系统内唯一',
  `menu_id` varchar(191) NOT NULL COMMENT '所属菜单 ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '按钮状态，1 启用，0 禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_button_button_code_key` (`button_code`),
  KEY `sys_button_menu_id_idx` (`menu_id`),
  CONSTRAINT `sys_button_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统按钮表，定义页面按钮级权限';

CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id` varchar(191) NOT NULL COMMENT '关联主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `user_id` varchar(191) NOT NULL COMMENT '用户 ID',
  `role_id` varchar(191) NOT NULL COMMENT '角色 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_user_role_user_id_role_id_key` (`user_id`, `role_id`),
  KEY `sys_user_role_role_id_idx` (`role_id`),
  CONSTRAINT `sys_user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`),
  CONSTRAINT `sys_user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户与角色的关联关系表';

CREATE TABLE IF NOT EXISTS `sys_role_menu` (
  `id` varchar(191) NOT NULL COMMENT '关联主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `role_id` varchar(191) NOT NULL COMMENT '角色 ID',
  `menu_id` varchar(191) NOT NULL COMMENT '菜单 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_menu_role_id_menu_id_key` (`role_id`, `menu_id`),
  KEY `sys_role_menu_menu_id_idx` (`menu_id`),
  CONSTRAINT `sys_role_menu_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`),
  CONSTRAINT `sys_role_menu_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色与菜单的关联关系表';

CREATE TABLE IF NOT EXISTS `sys_role_button` (
  `id` varchar(191) NOT NULL COMMENT '关联主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `role_id` varchar(191) NOT NULL COMMENT '角色 ID',
  `button_id` varchar(191) NOT NULL COMMENT '按钮 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_button_role_id_button_id_key` (`role_id`, `button_id`),
  KEY `sys_role_button_button_id_idx` (`button_id`),
  CONSTRAINT `sys_role_button_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`),
  CONSTRAINT `sys_role_button_button_id_fkey` FOREIGN KEY (`button_id`) REFERENCES `sys_button` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色与按钮的关联关系表';

CREATE TABLE IF NOT EXISTS `sys_api_permission` (
  `id` varchar(191) NOT NULL COMMENT '接口权限主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `api_path` varchar(191) NOT NULL COMMENT '接口路径，系统内唯一',
  `request_method` varchar(191) NOT NULL COMMENT '请求方法，如 GET、POST',
  `api_name` varchar(191) NOT NULL COMMENT '接口名称',
  `role_ids` json NOT NULL COMMENT '可访问角色 ID 列表，JSON 数组',
  `status` int NOT NULL DEFAULT 1 COMMENT '接口状态，1 启用，0 禁用',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_api_permission_api_path_key` (`api_path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口权限表，定义 API 与可访问角色的映射';

CREATE TABLE IF NOT EXISTS `biz_product_category` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `parent_id` varchar(191) DEFAULT NULL,
  `level` int NOT NULL DEFAULT 1,
  `sort` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `department_id` varchar(191) NOT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_product_category_code_platform_dept_key` (`code`, `platform_id`, `department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

CREATE TABLE IF NOT EXISTS `biz_product` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `category_id` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `images` json DEFAULT NULL,
  `platform_id` varchar(191) NOT NULL,
  `department_id` varchar(191) NOT NULL,
  `status` int NOT NULL DEFAULT 1,
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_product_code_key` (`code`),
  KEY `biz_product_platform_dept_status_idx` (`platform_id`, `department_id`, `status`),
  KEY `biz_product_sort_idx` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品基础信息表';

CREATE TABLE IF NOT EXISTS `biz_product_sku` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `product_id` varchar(191) NOT NULL,
  `sku_code` varchar(191) NOT NULL,
  `spec_data` json DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `warn_stock` int NOT NULL DEFAULT 5,
  `sort` int NOT NULL DEFAULT 0,
  `shop_id` varchar(191) NOT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_product_sku_sku_code_key` (`sku_code`),
  KEY `biz_product_sku_shop_status_idx` (`shop_id`, `status`),
  CONSTRAINT `biz_product_sku_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `biz_product` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品 SKU 规格表';

CREATE TABLE IF NOT EXISTS `biz_platform` (
  `id` varchar(191) NOT NULL COMMENT '平台主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '平台名称',
  `code` varchar(191) NOT NULL COMMENT '平台编码，系统内唯一',
  `description` text DEFAULT NULL COMMENT '平台描述',
  `status` int NOT NULL DEFAULT 1 COMMENT '平台状态，1 启用，0 禁用',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '平台负责人用户 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_platform_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台表，用于管理多平台主体';

CREATE TABLE IF NOT EXISTS `biz_department` (
  `id` varchar(191) NOT NULL COMMENT '部门主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '部门名称',
  `code` varchar(191) NOT NULL COMMENT '部门编码，系统内唯一',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '父级部门 ID，空表示顶级部门',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  `status` int NOT NULL DEFAULT 1 COMMENT '部门状态，1 启用，0 禁用',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '部门负责人用户 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_department_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表，用于组织架构管理';

CREATE TABLE IF NOT EXISTS `biz_shop` (
  `id` varchar(191) NOT NULL COMMENT '店铺主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '店铺名称',
  `code` varchar(191) NOT NULL COMMENT '店铺编码，系统内唯一',
  `type` int NOT NULL DEFAULT 1 COMMENT '店铺类型，1为线上，2为线下',
  `address` text DEFAULT NULL COMMENT '店铺地址',
  `phone` varchar(191) DEFAULT NULL COMMENT '店铺联系电话',
  `avatar` varchar(191) DEFAULT NULL COMMENT '店铺头像或门店图片地址',
  `description` text DEFAULT NULL COMMENT '店铺描述',
  `platform_id` varchar(191) NOT NULL COMMENT '所属平台 ID',
  `department_id` varchar(191) NOT NULL COMMENT '所属部门 ID',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '店铺负责人用户 ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '店铺状态，1 启用，0 禁用',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_shop_code_key` (`code`),
  KEY `biz_shop_platform_dept_status_idx` (`platform_id`, `department_id`, `status`),
  KEY `biz_shop_sort_idx` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='店铺表，管理平台下的门店或经营主体';

CREATE TABLE IF NOT EXISTS `hr_position` (
  `id` varchar(191) NOT NULL COMMENT '岗位主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '岗位名称',
  `code` varchar(191) NOT NULL COMMENT '岗位编码，系统内唯一',
  `description` varchar(191) DEFAULT NULL COMMENT '岗位描述',
  `department_id` varchar(191) NOT NULL COMMENT '所属部门 ID',
  `level` int DEFAULT NULL COMMENT '岗位级别',
  `sequence` varchar(191) DEFAULT NULL COMMENT '岗位序列或职级序列',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hr_position_code_key` (`code`),
  KEY `hr_position_sort_idx` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位表，定义部门下的岗位信息';

CREATE TABLE IF NOT EXISTS `hr_employee` (
  `id` varchar(191) NOT NULL COMMENT '员工主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '员工姓名',
  `gender` int DEFAULT NULL COMMENT '性别',
  `age` int DEFAULT NULL COMMENT '年龄',
  `phone` varchar(191) DEFAULT NULL COMMENT '手机号',
  `email` varchar(191) DEFAULT NULL COMMENT '邮箱地址',
  `employee_no` varchar(191) DEFAULT NULL COMMENT '员工编号，系统内唯一',
  `job_no` varchar(191) DEFAULT NULL COMMENT '工号，系统内唯一',
  `department_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `position_id` varchar(191) DEFAULT NULL COMMENT '所属岗位 ID',
  `user_id` varchar(191) DEFAULT NULL COMMENT '关联用户 ID，系统内唯一',
  `manager_employee_id` varchar(191) DEFAULT NULL COMMENT '上级员工 ID',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '员工状态，1 在职，0 停用或离职',
  `join_date` datetime(3) DEFAULT NULL COMMENT '入职日期',
  `regularization_date` datetime(3) DEFAULT NULL COMMENT '转正日期',
  `contract_expire_time` datetime(3) DEFAULT NULL COMMENT '合同到期时间',
  `id_card_front_file` varchar(191) DEFAULT NULL COMMENT '身份证正面文件地址',
  `id_card_back_file` varchar(191) DEFAULT NULL COMMENT '身份证反面文件地址',
  `emergency_contact_name` varchar(191) DEFAULT NULL COMMENT '紧急联系人姓名',
  `emergency_contact_phone` varchar(191) DEFAULT NULL COMMENT '紧急联系人电话',
  `household_registration` varchar(191) DEFAULT NULL COMMENT '户籍信息',
  `political_status` varchar(191) DEFAULT NULL COMMENT '政治面貌',
  `education` varchar(191) DEFAULT NULL COMMENT '学历',
  `graduate_school` varchar(191) DEFAULT NULL COMMENT '毕业院校',
  `major` varchar(191) DEFAULT NULL COMMENT '专业',
  `social_security_base` decimal(10,2) DEFAULT NULL COMMENT '社保基数',
  `social_security_city` varchar(191) DEFAULT NULL COMMENT '社保缴纳城市',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hr_employee_employee_no_key` (`employee_no`),
  UNIQUE KEY `hr_employee_job_no_key` (`job_no`),
  UNIQUE KEY `hr_employee_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表，记录人事档案与入职信息';

CREATE TABLE IF NOT EXISTS `attendance_rule` (
  `id` varchar(191) NOT NULL COMMENT '规则主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `name` varchar(191) NOT NULL COMMENT '规则名称',
  `on_duty_time` varchar(191) NOT NULL COMMENT '上班时间，建议格式 HH:mm',
  `off_duty_time` varchar(191) NOT NULL COMMENT '下班时间，建议格式 HH:mm',
  `late_threshold` int NOT NULL DEFAULT 0 COMMENT '迟到阈值，单位分钟',
  `early_threshold` int NOT NULL DEFAULT 0 COMMENT '早退阈值，单位分钟',
  `absenteeism_threshold` int NOT NULL DEFAULT 0 COMMENT '旷工阈值，单位分钟',
  `color` varchar(191) DEFAULT NULL COMMENT 'UI 颜色展示',
  `opacity` int NOT NULL DEFAULT 50 COMMENT '颜色透明度规范',
  `status` int NOT NULL DEFAULT 1 COMMENT '规则状态，1 启用，0 禁用',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤规则表，定义上下班规则与阈值';

CREATE TABLE IF NOT EXISTS `attendance_schedule` (
  `id` varchar(191) NOT NULL COMMENT '排班主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `schedule_date` datetime(3) NOT NULL COMMENT '排班日期',
  `shift_name` varchar(191) NOT NULL COMMENT '班次名称',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `status` int NOT NULL DEFAULT 0 COMMENT '发布状态 (0:待发布, 1:已发布)',
  `publish_time` datetime(3) DEFAULT NULL COMMENT '发布时间',
  PRIMARY KEY (`id`),
  KEY `attendance_schedule_employee_date_idx` (`employee_id`, `schedule_date`),
  KEY `attendance_schedule_platform_dept_date_idx` (`platform_id`, `dept_id`, `schedule_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排班表，定义员工某天的班次安排';

CREATE TABLE IF NOT EXISTS `attendance_record` (
  `id` varchar(191) NOT NULL COMMENT '考勤记录主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `attendance_date` datetime(3) NOT NULL COMMENT '考勤日期',
  `schedule_id` varchar(191) DEFAULT NULL COMMENT '关联排班 ID',
  `shift_name` varchar(191) DEFAULT NULL COMMENT '班次名称',
  `scheduled_on_duty_time` varchar(191) DEFAULT NULL COMMENT '计划上班时间，建议格式 HH:mm',
  `scheduled_off_duty_time` varchar(191) DEFAULT NULL COMMENT '计划下班时间，建议格式 HH:mm',
  `actual_on_duty_time` datetime(3) DEFAULT NULL COMMENT '实际上班打卡时间',
  `actual_off_duty_time` datetime(3) DEFAULT NULL COMMENT '实际下班打卡时间',
  `on_duty_location` varchar(191) DEFAULT NULL COMMENT '上班打卡地点',
  `off_duty_location` varchar(191) DEFAULT NULL COMMENT '下班打卡地点',
  `on_duty_status` int NOT NULL DEFAULT 0 COMMENT '上班出勤状态',
  `off_duty_status` int NOT NULL DEFAULT 0 COMMENT '下班出勤状态',
  `work_duration_minutes` int DEFAULT NULL COMMENT '工作时长，单位分钟',
  `exception_type` varchar(191) DEFAULT NULL COMMENT '异常类型',
  `remark` varchar(191) DEFAULT NULL COMMENT '备注',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  PRIMARY KEY (`id`),
  KEY `attendance_record_employee_date_idx` (`employee_id`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表，记录员工打卡与出勤结果';

CREATE TABLE IF NOT EXISTS `attendance_leave` (
  `id` varchar(191) NOT NULL COMMENT '请假单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `leave_no` varchar(191) NOT NULL COMMENT '请假单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `leave_type` varchar(191) NOT NULL COMMENT '请假类型',
  `start_time` datetime(3) NOT NULL COMMENT '请假开始时间',
  `end_time` datetime(3) NOT NULL COMMENT '请假结束时间',
  `duration_hours` decimal(10,2) DEFAULT NULL COMMENT '请假时长，单位小时',
  `reason` varchar(191) DEFAULT NULL COMMENT '请假原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `sync_schedule` int NOT NULL DEFAULT 0 COMMENT '是否同步排班，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_leave_leave_no_key` (`leave_no`),
  KEY `attendance_leave_employee_start_idx` (`employee_id`, `start_time`),
  KEY `attendance_leave_approval_start_idx` (`approval_status`, `start_time`),
  KEY `attendance_leave_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假单表，记录员工请假申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_overtime` (
  `id` varchar(191) NOT NULL COMMENT '加班单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `overtime_no` varchar(191) NOT NULL COMMENT '加班单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `start_time` datetime(3) NOT NULL COMMENT '加班开始时间',
  `end_time` datetime(3) NOT NULL COMMENT '加班结束时间',
  `duration_hours` decimal(10,2) DEFAULT NULL COMMENT '加班时长，单位小时',
  `reason` varchar(191) DEFAULT NULL COMMENT '加班原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `sync_schedule` int NOT NULL DEFAULT 0 COMMENT '是否同步排班，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_overtime_overtime_no_key` (`overtime_no`),
  KEY `attendance_overtime_employee_start_idx` (`employee_id`, `start_time`),
  KEY `attendance_overtime_approval_start_idx` (`approval_status`, `start_time`),
  KEY `attendance_overtime_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加班单表，记录员工加班申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_patch_card` (
  `id` varchar(191) NOT NULL COMMENT '补卡单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `patch_no` varchar(191) NOT NULL COMMENT '补卡单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `patch_date` datetime(3) NOT NULL COMMENT '补卡日期',
  `patch_type` varchar(191) NOT NULL COMMENT '补卡类型',
  `target_time` datetime(3) NOT NULL COMMENT '目标补卡时间',
  `reason` varchar(191) DEFAULT NULL COMMENT '补卡原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_patch_card_patch_no_key` (`patch_no`),
  KEY `attendance_patch_card_employee_date_idx` (`employee_id`, `patch_date`),
  KEY `attendance_patch_card_approval_date_idx` (`approval_status`, `patch_date`),
  KEY `attendance_patch_card_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='补卡单表，记录员工补卡申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_schedule_change` (
  `id` varchar(191) NOT NULL COMMENT '调班单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `change_no` varchar(191) NOT NULL COMMENT '调班单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `change_date` datetime(3) NOT NULL COMMENT '调班日期',
  `before_shift_name` varchar(191) DEFAULT NULL COMMENT '调整前班次名称',
  `after_shift_name` varchar(191) DEFAULT NULL COMMENT '调整后班次名称',
  `change_type` varchar(191) NOT NULL COMMENT '调班类型',
  `reason` varchar(191) DEFAULT NULL COMMENT '调班原因',
  `operator_id` varchar(191) DEFAULT NULL COMMENT '操作人 ID',
  `notify_status` int NOT NULL DEFAULT 0 COMMENT '通知状态',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_schedule_change_change_no_key` (`change_no`),
  KEY `attendance_schedule_change_employee_date_idx` (`employee_id`, `change_date`),
  KEY `attendance_schedule_change_notify_date_idx` (`notify_status`, `change_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调班单表，记录班次调整申请与结果';

CREATE TABLE IF NOT EXISTS `approval_template` (
  `id` varchar(191) NOT NULL COMMENT '审批模板主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `name` varchar(191) NOT NULL COMMENT '模板名称',
  `type` varchar(191) NOT NULL COMMENT '模板类型',
  `platform_id` varchar(191) DEFAULT NULL,
  `platform_name` varchar(191) NOT NULL COMMENT '平台名称',
  `dept_id` varchar(191) DEFAULT NULL,
  `department_name` varchar(191) NOT NULL COMMENT '部门名称',
  `status` varchar(191) NOT NULL DEFAULT 'enabled' COMMENT '模板状态',
  `description` text DEFAULT NULL COMMENT '模板描述',
  `updated_at` varchar(191) NOT NULL COMMENT '前端更新时间',
  `nodes` json NOT NULL COMMENT '模板节点 JSON',
  `form_fields` json DEFAULT NULL COMMENT '自定义表单字段 JSON',
  PRIMARY KEY (`id`),
  KEY `approval_template_status_update_time_idx` (`status`, `update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批模板表';

CREATE TABLE IF NOT EXISTS `approval_request` (
  `id` varchar(191) NOT NULL COMMENT '审批单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `request_no` varchar(191) NOT NULL COMMENT '审批单号',
  `template_id` varchar(191) NOT NULL COMMENT '模板 ID',
  `template_name` varchar(191) NOT NULL COMMENT '模板名称',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '关联业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '关联业务 ID',
  `biz_no` varchar(191) DEFAULT NULL COMMENT '关联业务单号',
  `type` varchar(191) NOT NULL COMMENT '审批类型: attendance, finance, general',
  `applicant_id` varchar(191) NOT NULL COMMENT '申请人 ID',
  `applicant_name` varchar(191) NOT NULL COMMENT '申请人名称',
  `current_approver_id` varchar(191) DEFAULT NULL COMMENT '当前审批人 ID',
  `current_approver_name` varchar(191) DEFAULT NULL COMMENT '当前审批人名称',
  `current_node_id` varchar(191) DEFAULT NULL COMMENT '当前审批节点 ID',
  `status` varchar(191) NOT NULL COMMENT '审批状态: pending, approved, rejected, withdrawn',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '金额',
  `platform_id` varchar(191) DEFAULT NULL,
  `platform_name` varchar(191) NOT NULL COMMENT '平台名称',
  `dept_id` varchar(191) DEFAULT NULL,
  `department_name` varchar(191) NOT NULL COMMENT '部门名称',
  `summary` text NOT NULL COMMENT '审批摘要',
  `form_data` json DEFAULT NULL COMMENT '提交的自定义表单数据',
  `created_at` varchar(191) NOT NULL COMMENT '前端创建时间',
  `updated_at` varchar(191) NOT NULL COMMENT '前端更新时间',
  `progress` json NOT NULL COMMENT '审批进度 JSON',
  PRIMARY KEY (`id`),
  UNIQUE KEY `approval_request_request_no_key` (`request_no`),
  UNIQUE KEY `approval_request_biz_type_biz_id_key` (`biz_type`, `biz_id`),
  KEY `approval_request_status_update_time_idx` (`status`, `update_time`),
  KEY `approval_request_applicant_id_update_time_idx` (`applicant_id`, `update_time`),
  KEY `approval_request_current_approver_id_update_time_idx` (`current_approver_id`, `update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批单表';

CREATE TABLE IF NOT EXISTS `approval_event` (
  `id` varchar(191) NOT NULL COMMENT '审批事件主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `request_id` varchar(191) NOT NULL COMMENT '审批单 ID',
  `request_no` varchar(191) NOT NULL COMMENT '审批单号',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '业务 ID',
  `event_type` varchar(191) NOT NULL COMMENT '事件类型',
  `event_source` varchar(191) NOT NULL COMMENT '事件来源',
  `request_status_from` varchar(191) DEFAULT NULL COMMENT '审批状态变更前',
  `request_status_to` varchar(191) DEFAULT NULL COMMENT '审批状态变更后',
  `biz_status_from` int DEFAULT NULL COMMENT '业务状态变更前',
  `biz_status_to` int DEFAULT NULL COMMENT '业务状态变更后',
  `operator_id` varchar(191) DEFAULT NULL COMMENT '操作人 ID',
  `operator_name` varchar(191) DEFAULT NULL COMMENT '操作人名称',
  `dedup_key` varchar(191) DEFAULT NULL COMMENT '去重键',
  `external_event_id` varchar(191) DEFAULT NULL COMMENT '外部事件 ID',
  `payload` json DEFAULT NULL COMMENT '事件原始载荷',
  PRIMARY KEY (`id`),
  UNIQUE KEY `approval_event_dedup_key_key` (`dedup_key`),
  KEY `approval_event_request_id_create_time_idx` (`request_id`, `create_time`),
  KEY `approval_event_request_no_create_time_idx` (`request_no`, `create_time`),
  KEY `approval_event_event_type_create_time_idx` (`event_type`, `create_time`),
  KEY `approval_event_event_source_create_time_idx` (`event_source`, `create_time`),
  KEY `approval_event_biz_type_biz_id_create_time_idx` (`biz_type`, `biz_id`, `create_time`),
  KEY `approval_event_external_event_id_idx` (`external_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批事件审计表';

CREATE TABLE IF NOT EXISTS `sys_message` (
  `id` varchar(191) NOT NULL COMMENT '站内消息主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `recipient_id` varchar(191) NOT NULL COMMENT '接收人 ID',
  `title` varchar(191) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息内容',
  `message_type` varchar(191) NOT NULL COMMENT '消息类型',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '关联业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '关联业务 ID',
  `route` varchar(191) DEFAULT NULL COMMENT '前端跳转路径',
  `read_status` int NOT NULL DEFAULT 0 COMMENT '是否已读',
  `read_time` datetime(3) DEFAULT NULL COMMENT '已读时间',
  `sender_id` varchar(191) DEFAULT NULL COMMENT '发送人 ID',
  `sender_name` varchar(191) DEFAULT NULL COMMENT '发送人名称',
  `payload` json DEFAULT NULL COMMENT '消息扩展载荷',
  PRIMARY KEY (`id`),
  KEY `sys_message_recipient_id_read_status_create_time_idx` (`recipient_id`, `read_status`, `create_time`),
  KEY `sys_message_message_type_create_time_idx` (`message_type`, `create_time`),
  KEY `sys_message_biz_type_biz_id_create_time_idx` (`biz_type`, `biz_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内消息表';

CREATE TABLE IF NOT EXISTS `sys_login_log` (
  `id` varchar(191) NOT NULL COMMENT '日志主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `user_id` varchar(191) DEFAULT NULL COMMENT '用户 ID',
  `username` varchar(191) NOT NULL COMMENT '登录用户名',
  `login_ip` varchar(191) DEFAULT NULL COMMENT '登录 IP',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '用户代理',
  `login_status` int NOT NULL DEFAULT 1 COMMENT '登录状态，1 成功，0 失败',
  `login_message` varchar(191) DEFAULT NULL COMMENT '登录结果说明',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  KEY `sys_login_log_username_create_idx` (`username`, `create_time`),
  KEY `sys_login_log_status_create_idx` (`login_status`, `create_time`),
  KEY `sys_login_log_platform_id_idx` (`platform_id`),
  KEY `sys_login_log_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志表，记录用户登录结果与终端信息';

CREATE TABLE IF NOT EXISTS `sys_login_log_archive` (
  `id` varchar(191) NOT NULL COMMENT '归档 ID',
  `create_time` datetime(3) NOT NULL COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0,
  `user_id` varchar(191) DEFAULT NULL,
  `username` varchar(191) NOT NULL,
  `login_ip` varchar(191) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `login_status` int NOT NULL DEFAULT 1,
  `login_message` varchar(191) DEFAULT NULL,
  `platform_id` varchar(191) DEFAULT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sys_login_log_archive_platform_create_idx` (`platform_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志归档表';

CREATE TABLE IF NOT EXISTS `sys_operation_log` (
  `id` varchar(191) NOT NULL COMMENT '日志主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `user_id` varchar(191) DEFAULT NULL COMMENT '用户 ID',
  `username` varchar(191) DEFAULT NULL COMMENT '操作用户名',
  `request_method` varchar(32) NOT NULL COMMENT '请求方法',
  `api_path` varchar(191) NOT NULL COMMENT '接口路径',
  `api_name` varchar(191) DEFAULT NULL COMMENT '权限编码或接口名称',
  `operation_module` varchar(191) DEFAULT NULL COMMENT '操作模块',
  `request_ip` varchar(191) DEFAULT NULL COMMENT '请求 IP',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '用户代理',
  `operation_status` int NOT NULL DEFAULT 1 COMMENT '操作状态，1 成功，0 失败',
  `operation_message` varchar(191) DEFAULT NULL COMMENT '操作结果说明',
  `request_params` json DEFAULT NULL COMMENT '请求参数摘要',
  `response_summary` json DEFAULT NULL COMMENT '响应摘要',
  `diff_content` json DEFAULT NULL COMMENT '字段级变更详情',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  KEY `sys_operation_log_platform_dept_idx` (`platform_id`, `dept_id`),
  KEY `sys_operation_log_user_create_idx` (`user_id`, `create_time`),
  KEY `sys_operation_log_module_create_idx` (`operation_module`, `create_time`),
  KEY `sys_operation_log_status_create_idx` (`operation_status`, `create_time`),
  KEY `sys_operation_log_create_time_idx` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表，记录接口级操作行为';

CREATE TABLE IF NOT EXISTS `sys_operation_log_archive` (
  `id` varchar(191) NOT NULL COMMENT '归档 ID',
  `create_time` datetime(3) NOT NULL,
  `update_time` datetime(3) NOT NULL,
  `is_deleted` int NOT NULL DEFAULT 0,
  `user_id` varchar(191) DEFAULT NULL,
  `username` varchar(191) DEFAULT NULL,
  `request_method` varchar(32) NOT NULL,
  `api_path` varchar(191) NOT NULL,
  `api_name` varchar(191) DEFAULT NULL,
  `operation_module` varchar(191) DEFAULT NULL,
  `request_ip` varchar(191) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `operation_status` int NOT NULL DEFAULT 1,
  `operation_message` varchar(191) DEFAULT NULL,
  `request_params` json DEFAULT NULL,
  `response_summary` json DEFAULT NULL,
  `platform_id` varchar(191) DEFAULT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sys_op_log_archive_platform_create_idx` (`platform_id`, `create_time`),
  KEY `sys_op_log_archive_user_create_idx` (`user_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志归档表';

CREATE TABLE IF NOT EXISTS `sys_error_log` (
  `id` varchar(191) NOT NULL COMMENT '日志主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `user_id` varchar(191) DEFAULT NULL,
  `username` varchar(191) DEFAULT NULL,
  `request_method` varchar(32) DEFAULT NULL,
  `api_path` varchar(191) DEFAULT NULL,
  `request_params` json DEFAULT NULL,
  `error_message` text NOT NULL,
  `stack_trace` longtext DEFAULT NULL,
  `platform_id` varchar(191) DEFAULT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sys_error_log_create_time_idx` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局异常追踪日志表';

CREATE TABLE IF NOT EXISTS `attendance_monthly_summary` (
  `id` varchar(191) NOT NULL COMMENT '汇总主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `employee_id` varchar(191) NOT NULL,
  `month` varchar(32) NOT NULL COMMENT '格式: YYYY-MM',
  `normal_days` int NOT NULL DEFAULT 0,
  `late_count` int NOT NULL DEFAULT 0,
  `early_count` int NOT NULL DEFAULT 0,
  `absent_days` int NOT NULL DEFAULT 0,
  `miss_count` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) DEFAULT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_monthly_summary_emp_month_unique` (`employee_id`, `month`),
  KEY `attendance_monthly_summary_platform_month_idx` (`platform_id`, `dept_id`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤月度结果预处理快照表';

CREATE TABLE IF NOT EXISTS `service_session` (
  `id` varchar(191) NOT NULL COMMENT '会话主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_no` varchar(191) NOT NULL COMMENT '会话编号',
  `customer_id` varchar(191) DEFAULT NULL COMMENT '客户 ID',
  `customer_nickname` varchar(191) DEFAULT NULL COMMENT '客户昵称',
  `customer_satisfaction` int DEFAULT NULL COMMENT '客户满意度',
  `agent_user_id` varchar(191) DEFAULT NULL COMMENT '客服用户 ID',
  `agent_name` varchar(191) DEFAULT NULL COMMENT '客服名称',
  `group_name` varchar(191) DEFAULT NULL COMMENT '坐席组名称',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `status` varchar(191) NOT NULL DEFAULT 'pending' COMMENT '会话状态',
  `transfer_status` varchar(191) NOT NULL DEFAULT 'none' COMMENT '转接状态',
  `started_at` datetime(3) NOT NULL COMMENT '开始时间',
  `ended_at` datetime(3) DEFAULT NULL COMMENT '结束时间',
  `first_response_at` datetime(3) DEFAULT NULL COMMENT '首次响应时间',
  `last_message_at` datetime(3) DEFAULT NULL COMMENT '最后消息时间',
  `response_duration_sec` int DEFAULT NULL COMMENT '平均响应时长秒数',
  `tags` json DEFAULT NULL COMMENT '会话标签',
  `remark` text DEFAULT NULL COMMENT '会话备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_session_session_no_key` (`session_no`),
  KEY `service_session_scope_status_idx` (`platform_id`, `dept_id`, `shop_id`, `status`),
  KEY `service_session_agent_started_idx` (`agent_user_id`, `started_at`),
  KEY `service_session_started_ended_idx` (`started_at`, `ended_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服会话表';

CREATE TABLE IF NOT EXISTS `service_session_message` (
  `id` varchar(191) NOT NULL COMMENT '会话消息主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话编号',
  `sender_type` varchar(191) NOT NULL COMMENT '发送方类型',
  `sender_id` varchar(191) DEFAULT NULL COMMENT '发送方 ID',
  `sender_name` varchar(191) DEFAULT NULL COMMENT '发送方名称',
  `message_type` varchar(191) NOT NULL DEFAULT 'text' COMMENT '消息类型',
  `content` text NOT NULL COMMENT '消息内容',
  `attachments` json DEFAULT NULL COMMENT '附件信息',
  `sent_at` datetime(3) NOT NULL COMMENT '发送时间',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  PRIMARY KEY (`id`),
  KEY `service_session_message_session_sent_idx` (`session_id`, `sent_at`),
  KEY `service_session_message_scope_sent_idx` (`platform_id`, `dept_id`, `shop_id`, `sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服会话消息表';

CREATE TABLE IF NOT EXISTS `service_quality_rule` (
  `id` varchar(191) NOT NULL COMMENT '质检规则主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `rule_name` varchar(191) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(191) NOT NULL COMMENT '规则类型',
  `description` text DEFAULT NULL COMMENT '规则描述',
  `deduct_score` int NOT NULL DEFAULT 0 COMMENT '扣分值',
  `pass_threshold` int NOT NULL DEFAULT 0 COMMENT '达标阈值',
  `trigger_keywords` json DEFAULT NULL COMMENT '触发关键词',
  `response_timeout_sec` int DEFAULT NULL COMMENT '响应超时秒数',
  `enabled` int NOT NULL DEFAULT 1 COMMENT '启用状态',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `created_by` varchar(191) DEFAULT NULL COMMENT '创建人 ID',
  PRIMARY KEY (`id`),
  KEY `service_quality_rule_scope_enabled_sort_idx` (`platform_id`, `dept_id`, `shop_id`, `enabled`, `sort`),
  KEY `service_quality_rule_type_enabled_idx` (`rule_type`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服质检规则表';

CREATE TABLE IF NOT EXISTS `service_sensitive_term` (
  `id` varchar(191) NOT NULL COMMENT '敏感词主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `term` varchar(191) NOT NULL COMMENT '敏感词',
  `category` varchar(191) NOT NULL COMMENT '分类',
  `severity` int NOT NULL DEFAULT 1 COMMENT '严重级别',
  `enabled` int NOT NULL DEFAULT 1 COMMENT '启用状态',
  `replace_text` varchar(191) DEFAULT NULL COMMENT '替代文本',
  `description` text DEFAULT NULL COMMENT '描述',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `created_by` varchar(191) DEFAULT NULL COMMENT '创建人 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_sensitive_term_term_scope_key` (`term`, `platform_id`, `dept_id`, `shop_id`),
  KEY `service_sensitive_term_scope_enabled_idx` (`platform_id`, `dept_id`, `shop_id`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服敏感词表';

CREATE TABLE IF NOT EXISTS `service_session_analysis` (
  `id` varchar(191) NOT NULL COMMENT 'AI分析主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话编号',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `triggered_by` varchar(191) NOT NULL DEFAULT 'system' COMMENT '触发方式',
  `triggered_by_user_id` varchar(191) DEFAULT NULL COMMENT '触发人 ID',
  `quality_score` int NOT NULL DEFAULT 100 COMMENT '质检得分',
  `quality_passed` int NOT NULL DEFAULT 1 COMMENT '是否合格',
  `loss_risk_level` varchar(191) NOT NULL DEFAULT 'low' COMMENT '询单流失风险等级',
  `loss_risk_score` int NOT NULL DEFAULT 0 COMMENT '询单流失风险分',
  `customer_sentiment` varchar(191) NOT NULL DEFAULT 'neutral' COMMENT '客户情绪',
  `response_timeout_count` int NOT NULL DEFAULT 0 COMMENT '响应超时次数',
  `sensitive_hit_count` int NOT NULL DEFAULT 0 COMMENT '敏感词命中次数',
  `faq_hit_count` int NOT NULL DEFAULT 0 COMMENT '高频问题数量',
  `top_faqs` json DEFAULT NULL COMMENT '高频问题列表',
  `sensitive_hits` json DEFAULT NULL COMMENT '敏感词命中明细',
  `triggered_rule_ids` json DEFAULT NULL COMMENT '命中规则列表',
  `summary` text DEFAULT NULL COMMENT '分析摘要',
  `suggestions` json DEFAULT NULL COMMENT '整改建议',
  `analyzed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '分析时间',
  PRIMARY KEY (`id`),
  KEY `service_session_analysis_session_analyzed_idx` (`session_id`, `analyzed_at`),
  KEY `service_session_analysis_scope_analyzed_idx` (`platform_id`, `dept_id`, `shop_id`, `analyzed_at`),
  KEY `service_session_analysis_pass_risk_idx` (`quality_passed`, `loss_risk_level`, `analyzed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服会话 AI 分析表';

CREATE TABLE IF NOT EXISTS `service_quality_record` (
  `id` varchar(191) NOT NULL COMMENT '质检记录主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `analysis_id` varchar(191) DEFAULT NULL COMMENT '关联分析 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话编号',
  `inspector_id` varchar(191) DEFAULT NULL COMMENT '质检人 ID',
  `inspector_name` varchar(191) DEFAULT NULL COMMENT '质检人名称',
  `inspection_mode` varchar(191) NOT NULL DEFAULT 'auto' COMMENT '质检方式',
  `score` int NOT NULL DEFAULT 100 COMMENT '得分',
  `passed` int NOT NULL DEFAULT 1 COMMENT '是否合格',
  `violations` json DEFAULT NULL COMMENT '违规项',
  `deduct_details` json DEFAULT NULL COMMENT '扣分详情',
  `comment` text DEFAULT NULL COMMENT '质检意见',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `rectification_status` varchar(191) NOT NULL DEFAULT 'not_required' COMMENT '整改状态',
  `rectification_note` text DEFAULT NULL COMMENT '整改说明',
  `inspected_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '质检时间',
  PRIMARY KEY (`id`),
  KEY `service_quality_record_session_inspected_idx` (`session_id`, `inspected_at`),
  KEY `service_quality_record_scope_pass_idx` (`platform_id`, `dept_id`, `shop_id`, `passed`, `inspected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服质检记录表';

CREATE TABLE IF NOT EXISTS `service_satisfaction` (
  `id` varchar(191) NOT NULL COMMENT '满意度记录主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话编号',
  `rating` int NOT NULL COMMENT '评价分值',
  `label` varchar(191) NOT NULL COMMENT '评价标签',
  `content` text DEFAULT NULL COMMENT '评价内容',
  `customer_id` varchar(191) DEFAULT NULL COMMENT '客户 ID',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `created_at_text` varchar(191) DEFAULT NULL COMMENT '外部创建时间文本',
  PRIMARY KEY (`id`),
  KEY `service_satisfaction_session_rating_idx` (`session_id`, `rating`),
  KEY `service_satisfaction_scope_rating_idx` (`platform_id`, `dept_id`, `shop_id`, `rating`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服满意度记录表';

CREATE TABLE `exam_paper` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL,
  `is_deleted` int NOT NULL DEFAULT 0,
  `paper_name` varchar(191) NOT NULL,
  `description` longtext,
  `total_score` int NOT NULL DEFAULT 100,
  `pass_score` int NOT NULL DEFAULT 60,
  `duration_min` int NOT NULL DEFAULT 60,
  `enabled` int NOT NULL DEFAULT 1,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `exam_paper_platform_id_dept_id_shop_id_enabled_idx` (`platform_id`,`dept_id`,`shop_id`,`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考试试卷表';

CREATE TABLE `exam_paper_question` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL,
  `is_deleted` int NOT NULL DEFAULT 0,
  `paper_id` varchar(191) NOT NULL,
  `question_type` varchar(191) NOT NULL,
  `title` longtext NOT NULL,
  `options` json DEFAULT NULL,
  `correct_answer` json NOT NULL,
  `score` int NOT NULL DEFAULT 0,
  `sort` int NOT NULL DEFAULT 0,
  `explanation` longtext,
  PRIMARY KEY (`id`),
  KEY `exam_paper_question_paper_id_sort_idx` (`paper_id`,`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='试卷题目表';

CREATE TABLE `exam_plan` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL,
  `is_deleted` int NOT NULL DEFAULT 0,
  `plan_name` varchar(191) NOT NULL,
  `paper_id` varchar(191) NOT NULL,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) NOT NULL,
  `reminder_mode` varchar(191) NOT NULL DEFAULT 'notice',
  `force_enter` int NOT NULL DEFAULT 0,
  `pass_score` int NOT NULL DEFAULT 60,
  `duration_min` int NOT NULL DEFAULT 60,
  `max_attempts` int NOT NULL DEFAULT 3,
  `allow_retake` int NOT NULL DEFAULT 0,
  `absent_mark_minutes` int NOT NULL DEFAULT 30,
  `allow_makeup` int NOT NULL DEFAULT 0,
  `makeup_limit` int NOT NULL DEFAULT 0,
  `target_dept_ids` json DEFAULT NULL,
  `target_employee_ids` json DEFAULT NULL,
  `target_count` int NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'draft',
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `exam_plan_paper_id_idx` (`paper_id`),
  KEY `exam_plan_platform_id_dept_id_shop_id_start_time_end_time_idx` (`platform_id`,`dept_id`,`shop_id`,`start_time`,`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考试计划表';

CREATE TABLE `exam_assignment` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL,
  `is_deleted` int NOT NULL DEFAULT 0,
  `plan_id` varchar(191) NOT NULL,
  `paper_id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `employee_id` varchar(191) DEFAULT NULL,
  `employee_name` varchar(191) DEFAULT NULL,
  `employee_no` varchar(191) DEFAULT NULL,
  `target_dept_id` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `attempt_count` int NOT NULL DEFAULT 0,
  `started_at` datetime(3) DEFAULT NULL,
  `submitted_at` datetime(3) DEFAULT NULL,
  `score` int DEFAULT NULL,
  `passed` int DEFAULT NULL,
  `auto_graded` int NOT NULL DEFAULT 0,
  `answers` json DEFAULT NULL,
  `attempts_history` json DEFAULT NULL,
  `manual_absent_marked` int NOT NULL DEFAULT 0,
  `manual_absent_reason` longtext,
  `correct_count` int NOT NULL DEFAULT 0,
  `question_count` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `reminder_mode` varchar(191) NOT NULL DEFAULT 'notice',
  `force_enter` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_assignment_plan_id_user_id_key` (`plan_id`,`user_id`),
  KEY `exam_assignment_user_id_status_submitted_at_idx` (`user_id`,`status`,`submitted_at`),
  KEY `exam_assignment_platform_id_dept_id_shop_id_status_submitted_at_idx` (`platform_id`,`dept_id`,`shop_id`,`status`,`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考试分配与答题记录表';

CREATE TABLE IF NOT EXISTS `knowledge_article` (
  `id` varchar(191) NOT NULL COMMENT '知识库文章主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `title` varchar(191) NOT NULL COMMENT '文章标题',
  `content` text NOT NULL COMMENT '文章内容',
  `category_id` varchar(191) DEFAULT NULL COMMENT '分类 ID',
  `category_name` varchar(191) DEFAULT NULL COMMENT '分类名称',
  `status` varchar(191) NOT NULL DEFAULT 'draft' COMMENT '状态',
  `author_id` varchar(191) DEFAULT NULL COMMENT '作者 ID',
  `author_name` varchar(191) DEFAULT NULL COMMENT '作者名称',
  `source_type` varchar(191) DEFAULT NULL COMMENT '来源类型: manual, document',
  `source_ref` varchar(191) DEFAULT NULL COMMENT '来源引用ID: document_id',
  `keyword` varchar(191) DEFAULT NULL COMMENT '关键词',
  `attachment_urls` json DEFAULT NULL COMMENT '附件链接列表',
  `is_public` int NOT NULL DEFAULT 0 COMMENT '是否公共知识: 0私有, 1公共',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `published_at` datetime(3) DEFAULT NULL COMMENT '发布时间',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值，越小越靠前',
  PRIMARY KEY (`id`),
  KEY `knowledge_article_scope_status_idx` (`platform_id`, `dept_id`, `shop_id`, `status`),
  KEY `knowledge_article_category_status_idx` (`category_id`, `status`),
  KEY `knowledge_article_keyword_status_idx` (`keyword`, `status`),
  KEY `knowledge_article_source_idx` (`source_type`, `source_ref`),
  KEY `knowledge_article_sort_idx` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库文章表';

CREATE TABLE IF NOT EXISTS `knowledge_document` (
  `id` varchar(191) NOT NULL COMMENT '文档主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `file_name` varchar(191) NOT NULL COMMENT '文件名称',
  `file_path` varchar(191) NOT NULL COMMENT 'MinIO路径',
  `file_size` int NOT NULL COMMENT '文件大小',
  `file_type` varchar(191) NOT NULL COMMENT 'pdf, docx, xlsx, pptx',
  `status` varchar(191) NOT NULL DEFAULT 'pending' COMMENT '处理状态',
  `progress` int NOT NULL DEFAULT 0 COMMENT '处理进度百分比 0-100',
  `content` longtext DEFAULT NULL COMMENT '解析后的全文内容',
  `error_msg` text DEFAULT NULL COMMENT '错误信息',
  `process_log` text DEFAULT NULL COMMENT '处理日志',
  `vector_ids` json DEFAULT NULL COMMENT 'Qdrant点ID',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `uploader_id` varchar(191) DEFAULT NULL COMMENT '上传者 ID',
  `is_public` int NOT NULL DEFAULT 0 COMMENT '是否公共知识: 0私有, 1公共',
  PRIMARY KEY (`id`),
  KEY `knowledge_doc_scope_status_idx` (`platform_id`, `dept_id`, `shop_id`, `status`),
  KEY `knowledge_doc_status_time_idx` (`status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库文档处理表';


CREATE TABLE IF NOT EXISTS `knowledge_chat_session` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `title` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `knowledge_chat_session_user_idx` (`user_id`, `create_time`),
  KEY `knowledge_chat_session_scope_idx` (`platform_id`, `dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库对话会话表';

CREATE TABLE IF NOT EXISTS `knowledge_chat_message` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `session_id` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL COMMENT 'user, assistant',
  `content` longtext NOT NULL,
  `references` json DEFAULT NULL COMMENT '引用知识点ID',
  PRIMARY KEY (`id`),
  KEY `knowledge_chat_msg_session_idx` (`session_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库对话消息表';

CREATE TABLE IF NOT EXISTS `knowledge_category` (
  `id` varchar(191) NOT NULL COMMENT '知识库分类主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `category_name` varchar(191) NOT NULL COMMENT '分类名称',
  `category_code` varchar(191) NOT NULL COMMENT '分类编码',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '父级分类 ID',
  `level` int NOT NULL DEFAULT 1 COMMENT '分类层级',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `enabled` int NOT NULL DEFAULT 1 COMMENT '启用状态',
  `description` text DEFAULT NULL COMMENT '分类描述',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `knowledge_category_code_scope_key` (`category_code`, `platform_id`, `dept_id`, `shop_id`),
  KEY `knowledge_category_scope_enabled_sort_idx` (`platform_id`, `dept_id`, `shop_id`, `enabled`, `sort`),
  KEY `knowledge_category_parent_sort_idx` (`parent_id`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库分类表';

CREATE TABLE IF NOT EXISTS `knowledge_tag` (
  `id` varchar(191) NOT NULL COMMENT '知识标签主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `tag_name` varchar(191) NOT NULL COMMENT '标签名称',
  `tag_code` varchar(191) NOT NULL COMMENT '标签编码',
  `source_type` varchar(191) DEFAULT NULL COMMENT '来源类型',
  `color` varchar(191) DEFAULT NULL COMMENT '标签颜色',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序值',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  `created_by` varchar(191) DEFAULT NULL COMMENT '创建人 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `knowledge_tag_name_scope_key` (`tag_name`, `platform_id`, `dept_id`, `shop_id`),
  KEY `knowledge_tag_scope_source_sort_idx` (`platform_id`, `dept_id`, `shop_id`, `source_type`, `sort`),
  KEY `knowledge_tag_code_source_idx` (`tag_code`, `source_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识标签表';

CREATE TABLE IF NOT EXISTS `attendance_record` (
  `id` varchar(191) NOT NULL COMMENT '考勤记录主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `attendance_date` datetime(3) NOT NULL COMMENT '考勤日期',
  `schedule_id` varchar(191) DEFAULT NULL COMMENT '关联排班 ID',
  `shift_name` varchar(191) DEFAULT NULL COMMENT '班次名称',
  `scheduled_on_duty_time` varchar(191) DEFAULT NULL COMMENT '计划上班时间',
  `scheduled_off_duty_time` varchar(191) DEFAULT NULL COMMENT '计划下班时间',
  `actual_on_duty_time` datetime(3) DEFAULT NULL COMMENT '实际上班打卡时间',
  `actual_off_duty_time` datetime(3) DEFAULT NULL COMMENT '实际下班打卡时间',
  `on_duty_location` varchar(191) DEFAULT NULL COMMENT '上班打卡地点',
  `off_duty_location` varchar(191) DEFAULT NULL COMMENT '下班打卡地点',
  `on_duty_status` int NOT NULL DEFAULT 0 COMMENT '上班出勤状态',
  `off_duty_status` int NOT NULL DEFAULT 0 COMMENT '下班出勤状态',
  `work_duration_minutes` int DEFAULT NULL COMMENT '工作时长',
  `exception_type` varchar(191) DEFAULT NULL COMMENT '异常类型',
  `remark` varchar(191) DEFAULT NULL COMMENT '备注',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  PRIMARY KEY (`id`),
  KEY `attendance_record_employee_date_idx` (`employee_id`, `attendance_date`),
  KEY `attendance_record_platform_dept_date_idx` (`platform_id`, `dept_id`, `attendance_date`),
  KEY `attendance_record_stats_idx` (`platform_id`, `dept_id`, `on_duty_status`, `off_duty_status`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤记录表';

CREATE TABLE IF NOT EXISTS `service_loss_inquiry` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话单号',
  `customer_id` varchar(191) DEFAULT NULL COMMENT '客户 ID',
  `customer_nickname` varchar(191) DEFAULT NULL COMMENT '客户昵称',
  `customer_phone` varchar(191) DEFAULT NULL COMMENT '客户手机号',
  `product_id` varchar(191) DEFAULT NULL COMMENT '关联商品 ID',
  `product_name` varchar(191) DEFAULT NULL COMMENT '关联商品名称',
  `agent_id` varchar(191) DEFAULT NULL COMMENT '客服 ID',
  `agent_name` varchar(191) DEFAULT NULL COMMENT '客服名称',
  `loss_reason` varchar(191) DEFAULT NULL COMMENT '流失原因',
  `recovery_state` varchar(191) NOT NULL DEFAULT 'pending' COMMENT '挽回状态',
  `recovery_remark` text DEFAULT NULL COMMENT '挽回备注',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  PRIMARY KEY (`id`),
  KEY `service_loss_inquiry_scope_state_idx` (`platform_id`, `dept_id`, `shop_id`, `recovery_state`),
  KEY `service_loss_inquiry_session_idx` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='询单流失记录表';

CREATE TABLE IF NOT EXISTS `service_session_tag` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `session_id` varchar(191) NOT NULL COMMENT '会话 ID',
  `session_no` varchar(191) NOT NULL COMMENT '会话单号',
  `tag_name` varchar(191) NOT NULL COMMENT '标签名称',
  `tag_type` varchar(191) NOT NULL DEFAULT 'quality' COMMENT '标签类型',
  `status` varchar(191) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `reject_reason` text DEFAULT NULL COMMENT '驳回原因',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  PRIMARY KEY (`id`),
  KEY `service_session_tag_scope_status_idx` (`platform_id`, `dept_id`, `shop_id`, `status`),
  KEY `service_session_tag_session_status_idx` (`session_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话质检标签流转表';

CREATE TABLE IF NOT EXISTS `service_faq_mapping` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `faq_content` varchar(191) NOT NULL COMMENT '高频问题内容',
  `article_id` varchar(191) DEFAULT NULL COMMENT '关联知识库ID',
  `hit_count` int NOT NULL DEFAULT 0 COMMENT '命中次数',
  `faq_type` varchar(191) DEFAULT NULL COMMENT 'FAQ类型',
  `product_id` varchar(191) DEFAULT NULL COMMENT '关联商品ID',
  `platform_id` varchar(191) NOT NULL COMMENT '平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺 ID',
  PRIMARY KEY (`id`),
  KEY `service_faq_mapping_platform_dept_faq_type_idx` (`platform_id`, `dept_id`, `shop_id`, `faq_type`),
  KEY `service_faq_mapping_hit_count_idx` (`hit_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='高频问题与标准知识映射表';

CREATE TABLE IF NOT EXISTS `attendance_coverage_check` (
  `id` varchar(191) NOT NULL COMMENT '检查记录主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `check_date` datetime(3) NOT NULL COMMENT '待检查的跨度日期',
  `start_time` datetime(3) NOT NULL COMMENT '范围开始时间',
  `end_time` datetime(3) NOT NULL COMMENT '范围结束时间',
  `checked_shift_ids` json NOT NULL COMMENT '检查包含的班次集',
  `checked_shift_names` json NOT NULL COMMENT '检查的班次名称清单',
  `total_coverage_hours` decimal(10,2) NOT NULL COMMENT '总覆盖时长',
  `missing_coverage_hours` decimal(10,2) NOT NULL COMMENT '缺口时长',
  `overlapping_hours` decimal(10,2) NOT NULL COMMENT '跨叠冗余排班时长',
  `missing_details` json DEFAULT NULL COMMENT '缺口分段明细',
  `overlapping_details` json DEFAULT NULL COMMENT '重叠冲突明细',
  `platform_id` varchar(191) NOT NULL COMMENT '所属平台',
  `dept_id` varchar(191) NOT NULL COMMENT '所属部门',
  PRIMARY KEY (`id`),
  KEY `attendance_coverage_check_date_idx` (`platform_id`, `dept_id`, `check_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班次分析覆盖检查快照表';

CREATE TABLE IF NOT EXISTS `attendance_ai_config` (
  `id` varchar(191) NOT NULL COMMENT '配置主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `conflict_rules` json DEFAULT NULL COMMENT '排班软硬冲突约束',
  `emp_preferences` json DEFAULT NULL COMMENT '员工防连班等倾向约束',
  `shift_priority` json DEFAULT NULL COMMENT '各时段班次需求人数约束',
  `algorithm_params` json DEFAULT NULL COMMENT '倾向业务覆盖与公平权衡属性',
  `ui_settings` json DEFAULT NULL COMMENT '统一前台面板规范配置',
  `platform_id` varchar(191) NOT NULL COMMENT '平台级别',
  `dept_id` varchar(191) NOT NULL COMMENT '部门归属配置',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_ai_config_unique_key` (`platform_id`, `dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成排班引擎规则全局统一配置表';

CREATE TABLE IF NOT EXISTS `sys_mapping_template` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL COMMENT '模版名称',
  `data_type` varchar(191) NOT NULL COMMENT '数据类型: order, product, customer',
  `platform_id` varchar(191) NOT NULL COMMENT '关联平台ID',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '父模版ID (Section 4.4.2)',
  `mapping_rules` json NOT NULL COMMENT '字段映射规则 JSON',
  `cleaning_rules` json DEFAULT NULL COMMENT '清洗规则 JSON',
  `is_public` int NOT NULL DEFAULT 1,
  `created_by` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sys_mapping_template_platform_type_idx` (`platform_id`, `data_type`, `status`),
  CONSTRAINT `fk_mapping_inheritance` FOREIGN KEY (`parent_id`) REFERENCES `sys_mapping_template` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据映射模版表';

CREATE TABLE IF NOT EXISTS `sys_platform_config` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL COMMENT '平台ID',
  `dept_id` varchar(191) NOT NULL COMMENT '部门ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '店铺ID',
  `template_id` varchar(191) DEFAULT NULL COMMENT '关联映射模版ID',
  `app_key` varchar(191) DEFAULT NULL,
  `app_secret` varchar(191) DEFAULT NULL,
  `api_endpoint` varchar(191) DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `token_expires` datetime(3) DEFAULT NULL,
  `extra_params` json DEFAULT NULL COMMENT '扩展参数',
  `is_master` int NOT NULL DEFAULT 0 COMMENT '是否为平台公共模版',
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sys_platform_config_scope_idx` (`platform_id`, `dept_id`, `shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门级平台数据配置表';

CREATE TABLE IF NOT EXISTS `bi_order` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `external_order_no` varchar(191) NOT NULL COMMENT '第三方平台订单号',
  `order_status` varchar(191) NOT NULL,
  `order_amount` decimal(10,2) NOT NULL,
  `pay_amount` decimal(10,2) DEFAULT NULL,
  `customer_name` varchar(191) DEFAULT NULL,
  `customer_phone` varchar(191) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `order_time` datetime(3) NOT NULL,
  `pay_time` datetime(3) DEFAULT NULL,
  `raw_data` json DEFAULT NULL COMMENT '原始各平台数据快照',
  `sync_status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bi_order_unique_idx` (`platform_id`, `shop_id`, `external_order_no`),
  KEY `bi_order_scope_time_idx` (`platform_id`, `dept_id`, `order_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准业务订单表';

CREATE TABLE IF NOT EXISTS `bi_product` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `external_spu_id` varchar(191) NOT NULL COMMENT '第三方平台商品ID',
  `product_name` varchar(191) NOT NULL,
  `main_image` varchar(191) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `status` varchar(191) DEFAULT NULL,
  `raw_data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bi_product_unique_idx` (`platform_id`, `shop_id`, `external_spu_id`),
  KEY `bi_product_scope_idx` (`platform_id`, `dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标准业务商品表';

CREATE TABLE IF NOT EXISTS `sys_cron_job` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `name` varchar(191) NOT NULL,
  `cron_expression` varchar(191) NOT NULL,
  `job_type` varchar(191) NOT NULL COMMENT 'fetch_orders, fetch_products, token_refresh',
  `assoc_config_id` varchar(191) DEFAULT NULL COMMENT '关联平台配置ID',
  `last_run_time` datetime(3) DEFAULT NULL,
  `next_run_time` datetime(3) DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT 3,
  `retry_interval` int NOT NULL DEFAULT 5,
  `current_retry` int NOT NULL DEFAULT 0 COMMENT '当前重试次数',
  `last_error` text DEFAULT NULL COMMENT '最后一次错误详情',
  `status` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `sys_cron_job_type_status_next_idx` (`job_type`, `status`, `next_run_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时采集任务表';

CREATE TABLE IF NOT EXISTS `sys_integration_log` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `biz_type` varchar(191) DEFAULT NULL COMMENT '业务类型: order_sync等',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '业务单号ID',
  `log_level` varchar(191) NOT NULL DEFAULT 'INFO',
  `message` text NOT NULL,
  `request_payload` json DEFAULT NULL,
  `response_data` json DEFAULT NULL,
  `error_stack` longtext DEFAULT NULL,
  `duration_ms` int NOT NULL DEFAULT 0,
  `error_code` varchar(191) DEFAULT NULL COMMENT '错误分类代码',
  PRIMARY KEY (`id`),
  KEY `sys_integration_log_scope_time_idx` (`platform_id`, `dept_id`, `create_time`),
  KEY `sys_integration_log_biz_idx` (`biz_type`, `biz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台对接集成日志表';

CREATE TABLE IF NOT EXISTS `sys_integration_stat` (
  `id` varchar(191) NOT NULL,
  `stat_time` datetime(3) NOT NULL COMMENT '统计时间点',
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `shop_id` varchar(191) DEFAULT NULL,
  `total_calls` int NOT NULL DEFAULT 0,
  `success_calls` int NOT NULL DEFAULT 0,
  `fail_calls` int NOT NULL DEFAULT 0,
  `avg_duration_ms` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_integration_stat_unique_idx` (`stat_time`, `platform_id`, `dept_id`, `shop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='集成接口健康统计表';

SET FOREIGN_KEY_CHECKS = 1;
CREATE TABLE IF NOT EXISTS `attendance_staffing_demand` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` int NOT NULL DEFAULT 0,
  `platform_id` varchar(191) NOT NULL,
  `dept_id` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL,
  `shift_name` varchar(191) NOT NULL,
  `required_count` int NOT NULL DEFAULT 0,
  `expected_volume` int DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_staffing_demand_unique` (`dept_id`, `date`, `shift_name`, `is_deleted`),
  INDEX `attendance_staffing_demand_platform_dept_date` (`platform_id`, `dept_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人力需求预测与拟合表';

-- [NEW] 大屏模板表 (Section 2.1.1)
CREATE TABLE IF NOT EXISTS `sys_dashboard_template` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `name` varchar(191) NOT NULL COMMENT '模板名称',
  `type` varchar(191) NOT NULL COMMENT '模板类型: global, ecommerce, hr, service, interface',
  `description` text COMMENT '模板描述',
  `platform_ids` json DEFAULT NULL COMMENT '关联平台 ID 列表',
  `dept_ids` json DEFAULT NULL COMMENT '关联部门 ID 列表',
  `layout_config` json DEFAULT NULL COMMENT '自定义布局配置',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
  `created_by` varchar(191) DEFAULT NULL COMMENT '创建人 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_dashboard_template_name_key` (`name`),
  KEY `sys_dashboard_template_type_status_idx` (`type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大屏模板管理表';

-- [NEW] 大屏分享链接表 (Section 2.4.2)
CREATE TABLE IF NOT EXISTS `sys_dashboard_share` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `template_id` varchar(191) NOT NULL COMMENT '大屏模板 ID',
  `share_token` varchar(191) NOT NULL COMMENT '分享令牌',
  `expires_at` datetime(3) DEFAULT NULL COMMENT '过期时间',
  `platform_id` varchar(191) DEFAULT NULL,
  `dept_id` varchar(191) DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  `status` int NOT NULL DEFAULT 1 COMMENT '状态: 1-有效, 0-失效',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_dashboard_share_share_token_key` (`share_token`),
  KEY `sys_dashboard_share_token_status_idx` (`share_token`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大屏分享管理表';

-- [NEW] 大屏预警记录表 (Section 2.5.3)
CREATE TABLE IF NOT EXISTS `sys_dashboard_alert_record` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `template_id` varchar(191) NOT NULL COMMENT '模板 ID',
  `metric_name` varchar(191) NOT NULL COMMENT '预警指标名称',
  `threshold` decimal(10,2) NOT NULL COMMENT '阈值',
  `actual_value` decimal(10,2) NOT NULL COMMENT '实际值',
  `platform_id` varchar(191) NOT NULL COMMENT '关联平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '关联部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '关联店铺 ID',
  `status` varchar(191) NOT NULL DEFAULT 'pending' COMMENT '处理状态: pending, handled, ignored',
  `handle_note` text COMMENT '处理备注',
  `handle_user_id` varchar(191) DEFAULT NULL COMMENT '处理人 ID',
  `handle_time` datetime(3) DEFAULT NULL COMMENT '处理时间',
  PRIMARY KEY (`id`),
  KEY `sys_dashboard_alert_record_template_status_idx` (`template_id`, `status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据大屏预警历史记录表';

-- [NEW] 通知模板表 (Section 2.1)
CREATE TABLE IF NOT EXISTS `sys_message_template` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `name` varchar(191) NOT NULL COMMENT '模板名称',
  `tpl_type` varchar(191) NOT NULL COMMENT '模板类型: approval, attendance, order, service, interface',
  `content` text NOT NULL COMMENT '模板内容',
  `channels` varchar(191) NOT NULL DEFAULT 'internal' COMMENT '分发渠道 (英文逗号分隔)',
  `platform_id` varchar(191) NOT NULL COMMENT '关联平台 ID',
  `dept_id` varchar(191) NOT NULL COMMENT '关联部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '关联店铺 ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
  `created_by` varchar(191) DEFAULT NULL COMMENT '创建人 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_message_template_name_key` (`name`),
  KEY `sys_message_template_platform_dept_type_idx` (`platform_id`,`dept_id`,`tpl_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板管理表';

-- [NEW] 消息变量定义表 (Section 2.1.2)
CREATE TABLE IF NOT EXISTS `sys_message_variable` (
  `id` varchar(191) NOT NULL COMMENT '主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `name` varchar(191) NOT NULL COMMENT '变量名称 (如 ${username})',
  `biz_module` varchar(191) NOT NULL COMMENT '所属业务模块',
  `description` varchar(191) DEFAULT NULL COMMENT '变量描述',
  `platform_id` varchar(191) NOT NULL COMMENT '关联平台 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_message_variable_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板变量表';

-- [MODIFY] sys_message 表升级 (PRD 2.3.2)
ALTER TABLE `sys_message` ADD COLUMN IF NOT EXISTS `delete_time` datetime(3) DEFAULT NULL COMMENT '逻辑删除时间 (回收站)';
ALTER TABLE `sys_message` ADD COLUMN IF NOT EXISTS `is_favorite` int NOT NULL DEFAULT 0 COMMENT '是否收藏';
ALTER TABLE `sys_message` ADD COLUMN IF NOT EXISTS `delivery_channels` json DEFAULT NULL COMMENT '外部分发渠道状态';

-- ============================================================
-- 以下表由 Prisma Migrations 新增，与 schema.prisma 对齐
-- 同步时间: 2026-04-16
-- ============================================================

-- [20260413000000_add_schedule_history_table]
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


-- [20260414000000_add_v4_schedule_tables]
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


-- [20260415120000_add_interface_monitor_tables]
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


-- [20260415130000_add_activity_tables]
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


-- [20260415140000_add_agent_group_tables]
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


-- [20260415150000_add_permission_control_config]
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


-- [20260415170000_add_permission_template]
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


-- [20260415180000_add_employee_history]
CREATE TABLE `hr_employee_history` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `employee_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型: onboard(入职), transfer(调岗), promotion(晋升), regularization(转正), resignation(离职), status_change(状态变更)',
    `event_date` DATETIME(3) NOT NULL COMMENT '事件发生日期',
    `before_data` JSON NULL COMMENT '变更前数据',
    `after_data` JSON NULL COMMENT '变更后数据',
    `department_id` VARCHAR(191) NULL COMMENT '关联部门ID',
    `position_id` VARCHAR(191) NULL COMMENT '关联岗位ID',
    `remark` TEXT NULL COMMENT '备注说明',
    `operator_id` VARCHAR(191) NULL COMMENT '操作人ID',
    `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
    `platform_id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- [20260416000000_add_user_register_table]
CREATE TABLE `sys_user_register` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `reject_reason` TEXT NULL,
    `approve_time` DATETIME(3) NULL,
    `approver_id` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,

    INDEX `sys_user_register_phone_status_idx`(`phone`, `status`),
    INDEX `sys_user_register_status_create_time_idx`(`status`, `create_time`),
    INDEX `sys_user_register_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;



-- [sys_permission_config] 权限键值对配置表（来自 schema.prisma，无独立 migration）
CREATE TABLE IF NOT EXISTS `sys_permission_config` (
  `id` varchar(191) NOT NULL,
  `create_time` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `update_time` datetime(3) NOT NULL,
  `config_key` varchar(191) NOT NULL,
  `config_value` longtext NOT NULL,
  `config_type` varchar(191) NOT NULL COMMENT 'string/number/boolean/json',
  `description` varchar(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_permission_config_config_key_key` (`config_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
