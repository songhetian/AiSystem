-- CreateTable: JWT Token黑名单表
CREATE TABLE `sys_jwt_blacklist` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `token` VARCHAR(1000) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `expire_time` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_jwt_blacklist_token_key`(`token`),
    INDEX `sys_jwt_blacklist_token_idx`(`token`),
    INDEX `sys_jwt_blacklist_user_id_idx`(`user_id`),
    INDEX `sys_jwt_blacklist_expire_time_idx`(`expire_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 登录尝试记录表
CREATE TABLE `sys_login_attempt` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `username` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `attempt_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_success` INTEGER NOT NULL DEFAULT 0,

    INDEX `sys_login_attempt_username_attempt_time_idx`(`username`, `attempt_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: 更新sys_login_log表，添加新字段
ALTER TABLE `sys_login_log`
    ADD COLUMN `login_method` VARCHAR(191) NULL COMMENT '登录方式（password/sms/wechat）',
    ADD COLUMN `device_type` VARCHAR(191) NULL COMMENT '设备类型（pc/mobile/tablet）';

-- AlterTable: 更新sys_operation_log表，添加execution_time字段
ALTER TABLE `sys_operation_log`
    ADD COLUMN `execution_time` INTEGER NULL COMMENT '执行时间（毫秒）';
