-- CreateTable: service_quality_prompt_global
-- 全局Prompt表，存储平台级通用质检标准
CREATE TABLE `service_quality_prompt_global` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL COMMENT 'Prompt名称',
    `content` TEXT NOT NULL COMMENT 'Prompt内容',
    `applicable_scenarios` TEXT NULL COMMENT '适用场景描述',
    `enabled` INTEGER NOT NULL DEFAULT 1 COMMENT '是否启用: 1-启用, 0-禁用',
    `sort` INTEGER NOT NULL DEFAULT 0 COMMENT '排序字段',
    `version` INTEGER NOT NULL DEFAULT 1 COMMENT '版本号',
    `platform_id` VARCHAR(191) NOT NULL COMMENT '平台ID',
    `created_by` VARCHAR(191) NULL COMMENT '创建人ID',
    `updated_by` VARCHAR(191) NULL COMMENT '更新人ID',
    `remark` TEXT NULL COMMENT '备注',

    PRIMARY KEY (`id`),
    INDEX `idx_platform_enabled_sort` (`platform_id`, `enabled`, `sort`),
    INDEX `idx_name` (`name`),
    INDEX `idx_create_time` (`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='全局质检Prompt表';

-- CreateTable: service_quality_prompt_department
-- 部门Prompt表，存储部门级专项质检标准
CREATE TABLE `service_quality_prompt_department` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL COMMENT 'Prompt名称',
    `content` TEXT NOT NULL COMMENT 'Prompt内容',
    `applicable_scenarios` TEXT NULL COMMENT '适用场景描述',
    `enabled` INTEGER NOT NULL DEFAULT 1 COMMENT '是否启用: 1-启用, 0-禁用',
    `sort` INTEGER NOT NULL DEFAULT 0 COMMENT '排序字段',
    `version` INTEGER NOT NULL DEFAULT 1 COMMENT '版本号',
    `platform_id` VARCHAR(191) NOT NULL COMMENT '平台ID',
    `dept_id` VARCHAR(191) NOT NULL COMMENT '部门ID',
    `parent_global_prompt_ids` JSON NULL COMMENT '关联的全局Prompt ID列表',
    `created_by` VARCHAR(191) NULL COMMENT '创建人ID',
    `updated_by` VARCHAR(191) NULL COMMENT '更新人ID',
    `remark` TEXT NULL COMMENT '备注',

    PRIMARY KEY (`id`),
    INDEX `idx_platform_dept_enabled_sort` (`platform_id`, `dept_id`, `enabled`, `sort`),
    INDEX `idx_dept_id` (`dept_id`),
    INDEX `idx_name` (`name`),
    INDEX `idx_create_time` (`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='部门质检Prompt表';

-- CreateTable: service_quality_prompt_template
-- Prompt模板库表，存储预置和自定义模板
CREATE TABLE `service_quality_prompt_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL COMMENT '模板名称',
    `content` TEXT NOT NULL COMMENT '模板内容',
    `category` VARCHAR(100) NOT NULL COMMENT '模板分类: politeness, compliance, process',
    `industry` VARCHAR(100) NULL COMMENT '行业分类: e-commerce, finance, after-sales',
    `description` TEXT NULL COMMENT '模板描述',
    `is_builtin` INTEGER NOT NULL DEFAULT 0 COMMENT '是否内置模板: 1-内置, 0-自定义',
    `sort` INTEGER NOT NULL DEFAULT 0 COMMENT '排序字段',
    `platform_id` VARCHAR(191) NOT NULL COMMENT '平台ID',
    `created_by` VARCHAR(191) NULL COMMENT '创建人ID',

    PRIMARY KEY (`id`),
    INDEX `idx_platform_category_industry` (`platform_id`, `category`, `industry`),
    INDEX `idx_sort` (`sort`),
    INDEX `idx_is_builtin` (`is_builtin`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='质检Prompt模板库表';

-- CreateTable: service_quality_prompt_version
-- Prompt版本管理表，记录所有历史版本
CREATE TABLE `service_quality_prompt_version` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prompt_id` VARCHAR(191) NOT NULL COMMENT 'Prompt ID',
    `prompt_type` VARCHAR(50) NOT NULL COMMENT 'Prompt类型: global, department',
    `version_number` INTEGER NOT NULL COMMENT '版本号',
    `name` VARCHAR(255) NOT NULL COMMENT 'Prompt名称',
    `content` TEXT NOT NULL COMMENT 'Prompt内容',
    `applicable_scenarios` TEXT NULL COMMENT '适用场景描述',
    `change_description` TEXT NULL COMMENT '变更说明',
    `modified_by` VARCHAR(191) NULL COMMENT '修改人ID',
    `modified_by_name` VARCHAR(255) NULL COMMENT '修改人姓名',

    PRIMARY KEY (`id`),
    INDEX `idx_prompt_id_version` (`prompt_id`, `version_number` DESC),
    INDEX `idx_prompt_type` (`prompt_type`),
    INDEX `idx_create_time` (`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='质检Prompt版本历史表';

-- CreateTable: service_quality_prompt_permission
-- Prompt权限管理表（预留，当前通过角色权限系统管理）
CREATE TABLE `service_quality_prompt_permission` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NOT NULL COMMENT '用户ID',
    `role_code` VARCHAR(100) NOT NULL COMMENT '角色代码: super_admin, department_manager',
    `resource_type` VARCHAR(50) NOT NULL COMMENT '资源类型: global_prompt, department_prompt',
    `permissions` JSON NOT NULL COMMENT '权限列表: ["view", "create", "edit", "delete", "enable", "disable"]',
    `platform_id` VARCHAR(191) NOT NULL COMMENT '平台ID',
    `dept_id` VARCHAR(191) NULL COMMENT '部门ID（部门管理员必填）',

    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_user_role_resource` (`user_id`, `role_code`, `resource_type`),
    INDEX `idx_platform_dept` (`platform_id`, `dept_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='质检Prompt权限表';

-- CreateTable: service_quality_prompt_audit_log
-- Prompt审计日志表，记录所有操作
CREATE TABLE `service_quality_prompt_audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型: create, edit, delete, enable, disable, rollback',
    `operator_id` VARCHAR(191) NOT NULL COMMENT '操作人ID',
    `operator_name` VARCHAR(255) NOT NULL COMMENT '操作人姓名',
    `prompt_id` VARCHAR(191) NOT NULL COMMENT 'Prompt ID',
    `prompt_type` VARCHAR(50) NOT NULL COMMENT 'Prompt类型: global, department',
    `prompt_name` VARCHAR(255) NOT NULL COMMENT 'Prompt名称',
    `before_content` TEXT NULL COMMENT '修改前内容（仅edit操作）',
    `after_content` TEXT NULL COMMENT '修改后内容（仅edit操作）',
    `delete_reason` TEXT NULL COMMENT '删除原因（仅delete操作）',
    `platform_id` VARCHAR(191) NOT NULL COMMENT '平台ID',
    `dept_id` VARCHAR(191) NULL COMMENT '部门ID',
    `request_ip` VARCHAR(100) NULL COMMENT '请求IP',

    PRIMARY KEY (`id`),
    INDEX `idx_operator_time` (`operator_id`, `create_time` DESC),
    INDEX `idx_operation_type_time` (`operation_type`, `create_time` DESC),
    INDEX `idx_prompt_id` (`prompt_id`),
    INDEX `idx_platform_dept` (`platform_id`, `dept_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='质检Prompt审计日志表';
