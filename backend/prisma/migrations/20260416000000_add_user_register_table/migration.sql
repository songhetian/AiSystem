-- CreateTable
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
