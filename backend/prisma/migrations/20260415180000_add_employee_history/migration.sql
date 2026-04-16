-- CreateTable
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

-- CreateIndex
CREATE INDEX `hr_employee_history_employee_id_event_date_idx` ON `hr_employee_history`(`employee_id`, `event_date`);

-- CreateIndex
CREATE INDEX `hr_employee_history_event_type_idx` ON `hr_employee_history`(`event_type`);

-- CreateIndex
CREATE INDEX `hr_employee_history_platform_id_idx` ON `hr_employee_history`(`platform_id`);
