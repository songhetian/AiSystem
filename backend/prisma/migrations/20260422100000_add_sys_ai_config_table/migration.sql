-- CreateTable
CREATE TABLE `sys_ai_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `scope_type` VARCHAR(50) NOT NULL,
    `scope_id` VARCHAR(50) NULL,
    `provider` VARCHAR(50) NOT NULL,
    `api_key` TEXT NOT NULL,
    `api_base_url` VARCHAR(500) NULL,
    `model` VARCHAR(100) NOT NULL,
    `max_tokens` INTEGER NOT NULL DEFAULT 2000,
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    `extra_config` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_by` VARCHAR(50) NULL,
    `remark` TEXT NULL,

    UNIQUE INDEX `unique_scope`(`scope_type`, `scope_id`),
    INDEX `idx_scope_status`(`scope_type`, `scope_id`, `status`),
    INDEX `idx_provider_status`(`provider`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入默认全局配置（从环境变量迁移）
INSERT INTO `sys_ai_config` (
    `id`,
    `scope_type`,
    `scope_id`,
    `provider`,
    `api_key`,
    `api_base_url`,
    `model`,
    `max_tokens`,
    `temperature`,
    `status`,
    `remark`
) VALUES (
    'ai-config-global-default',
    'global',
    NULL,
    'openai',
    'sk-changeme',
    'https://api.openai.com/v1',
    'gpt-3.5-turbo',
    2000,
    0.7,
    1,
    '全局默认AI配置，从环境变量迁移而来。请修改API Key为实际值。'
);
