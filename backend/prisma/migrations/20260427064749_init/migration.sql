-- CreateTable
CREATE TABLE `knowledge_article` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `category_name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `author_id` VARCHAR(191) NULL,
    `author_name` VARCHAR(191) NULL,
    `source_type` VARCHAR(191) NULL,
    `source_ref` VARCHAR(191) NULL,
    `keyword` VARCHAR(191) NULL,
    `attachment_urls` JSON NULL,
    `is_public` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `published_at` DATETIME(3) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,

    INDEX `knowledge_article_platform_id_dept_id_is_deleted_status_idx`(`platform_id`, `dept_id`, `is_deleted`, `status`),
    INDEX `knowledge_article_category_id_is_deleted_idx`(`category_id`, `is_deleted`),
    INDEX `knowledge_article_keyword_is_deleted_idx`(`keyword`, `is_deleted`),
    INDEX `knowledge_article_source_type_source_ref_idx`(`source_type`, `source_ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_document` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `file_name` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `content` LONGTEXT NULL,
    `error_msg` TEXT NULL,
    `process_log` TEXT NULL,
    `vector_ids` JSON NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `uploader_id` VARCHAR(191) NULL,
    `is_public` INTEGER NOT NULL DEFAULT 0,

    INDEX `knowledge_document_platform_id_dept_id_status_idx`(`platform_id`, `dept_id`, `status`),
    INDEX `knowledge_document_status_create_time_idx`(`status`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_chat_session` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,

    INDEX `knowledge_chat_session_user_id_create_time_idx`(`user_id`, `create_time`),
    INDEX `knowledge_chat_session_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_chat_message` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `session_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `references` JSON NULL,

    INDEX `knowledge_chat_message_session_id_create_time_idx`(`session_id`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_category` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `category_name` VARCHAR(191) NOT NULL,
    `category_code` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `description` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `knowledge_category_platform_id_dept_id_shop_id_enabled_sort_idx`(`platform_id`, `dept_id`, `shop_id`, `enabled`, `sort`),
    INDEX `knowledge_category_parent_id_sort_idx`(`parent_id`, `sort`),
    UNIQUE INDEX `knowledge_category_category_code_platform_id_dept_id_shop_id_key`(`category_code`, `platform_id`, `dept_id`, `shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NULL,
    `platform_name` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `department_name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'enabled',
    `description` TEXT NULL,
    `updated_at` VARCHAR(191) NOT NULL,
    `nodes` JSON NOT NULL,
    `form_fields` JSON NULL,

    INDEX `approval_template_status_update_time_idx`(`status`, `update_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_request` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `request_no` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `template_name` VARCHAR(191) NOT NULL,
    `biz_type` VARCHAR(191) NULL,
    `biz_id` VARCHAR(191) NULL,
    `biz_no` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `applicant_id` VARCHAR(191) NOT NULL,
    `applicant_name` VARCHAR(191) NOT NULL,
    `current_approver_id` VARCHAR(191) NULL,
    `current_approver_name` VARCHAR(191) NULL,
    `current_node_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `platform_id` VARCHAR(191) NULL,
    `platform_name` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `department_name` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `form_data` JSON NULL,
    `created_at` VARCHAR(191) NOT NULL,
    `updated_at` VARCHAR(191) NOT NULL,
    `progress` JSON NOT NULL,

    UNIQUE INDEX `approval_request_request_no_key`(`request_no`),
    INDEX `approval_request_status_update_time_idx`(`status`, `update_time`),
    INDEX `approval_request_applicant_id_update_time_idx`(`applicant_id`, `update_time`),
    INDEX `approval_request_current_approver_id_update_time_idx`(`current_approver_id`, `update_time`),
    UNIQUE INDEX `approval_request_biz_type_biz_id_key`(`biz_type`, `biz_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_user` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `last_login_time` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_user_username_key`(`username`),
    INDEX `sys_user_platform_id_dept_id_status_idx`(`platform_id`, `dept_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_department` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NULL,
    `owner_id` VARCHAR(191) NULL,

    UNIQUE INDEX `biz_department_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_role` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `role_name` VARCHAR(191) NOT NULL,
    `role_code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `sys_role_role_code_key`(`role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_user_role` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `sys_user_role_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_api_permission` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `api_path` VARCHAR(191) NOT NULL,
    `request_method` VARCHAR(191) NOT NULL,
    `api_name` VARCHAR(191) NOT NULL,
    `role_ids` JSON NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_api_permission_api_path_key`(`api_path`),
    INDEX `sys_api_permission_api_path_status_idx`(`api_path`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_menu` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `menu_name` VARCHAR(191) NOT NULL,
    `menu_code` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `type` INTEGER NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `sys_menu_menu_code_key`(`menu_code`),
    UNIQUE INDEX `sys_menu_route_key`(`route`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_button` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `button_name` VARCHAR(191) NOT NULL,
    `button_code` VARCHAR(191) NOT NULL,
    `menu_id` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `sys_button_button_code_key`(`button_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_role_menu` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `menu_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `sys_role_menu_role_id_menu_id_key`(`role_id`, `menu_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_role_button` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `button_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `sys_role_button_role_id_button_id_key`(`role_id`, `button_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_login_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `login_ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(512) NULL,
    `login_status` INTEGER NOT NULL DEFAULT 1,
    `login_message` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,
    `login_method` VARCHAR(191) NULL,
    `device_type` VARCHAR(191) NULL,

    INDEX `sys_login_log_username_create_time_idx`(`username`, `create_time`),
    INDEX `sys_login_log_login_status_create_time_idx`(`login_status`, `create_time`),
    INDEX `sys_login_log_platform_id_idx`(`platform_id`),
    INDEX `sys_login_log_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_login_log_archive` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `login_ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(512) NULL,
    `login_status` INTEGER NOT NULL DEFAULT 1,
    `login_message` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `sys_login_log_archive_platform_id_create_time_idx`(`platform_id`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_operation_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `request_method` VARCHAR(191) NOT NULL,
    `api_path` VARCHAR(191) NOT NULL,
    `api_name` VARCHAR(191) NULL,
    `operation_module` VARCHAR(191) NULL,
    `request_ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(512) NULL,
    `operation_status` INTEGER NOT NULL DEFAULT 1,
    `operation_message` VARCHAR(191) NULL,
    `request_params` JSON NULL,
    `response_summary` JSON NULL,
    `diff_content` JSON NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,
    `execution_time` INTEGER NULL,

    INDEX `sys_operation_log_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
    INDEX `sys_operation_log_user_id_create_time_idx`(`user_id`, `create_time`),
    INDEX `sys_operation_log_operation_module_create_time_idx`(`operation_module`, `create_time`),
    INDEX `sys_operation_log_operation_status_create_time_idx`(`operation_status`, `create_time`),
    INDEX `sys_operation_log_create_time_idx`(`create_time`),
    INDEX `sys_operation_log_username_create_time_idx`(`username`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_error_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `request_method` VARCHAR(191) NULL,
    `api_path` VARCHAR(191) NULL,
    `request_params` JSON NULL,
    `error_message` TEXT NOT NULL,
    `stack_trace` LONGTEXT NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,

    INDEX `sys_error_log_create_time_idx`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_jwt_blacklist` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `token` VARCHAR(1000) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `expire_time` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_jwt_blacklist_token_key`(`token`(255)),
    INDEX `sys_jwt_blacklist_token_idx`(`token`(255)),
    INDEX `sys_jwt_blacklist_user_id_idx`(`user_id`),
    INDEX `sys_jwt_blacklist_expire_time_idx`(`expire_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `sys_operation_log_archive` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `request_method` VARCHAR(191) NOT NULL,
    `api_path` VARCHAR(191) NOT NULL,
    `api_name` VARCHAR(191) NULL,
    `operation_module` VARCHAR(191) NULL,
    `request_ip` VARCHAR(191) NULL,
    `user_agent` VARCHAR(512) NULL,
    `operation_status` INTEGER NOT NULL DEFAULT 1,
    `operation_message` VARCHAR(191) NULL,
    `request_params` JSON NULL,
    `response_summary` JSON NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `sys_operation_log_archive_platform_id_create_time_idx`(`platform_id`, `create_time`),
    INDEX `sys_operation_log_archive_user_id_create_time_idx`(`user_id`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_monthly_summary` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `employee_id` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `normal_days` INTEGER NOT NULL DEFAULT 0,
    `late_count` INTEGER NOT NULL DEFAULT 0,
    `early_count` INTEGER NOT NULL DEFAULT 0,
    `absent_days` INTEGER NOT NULL DEFAULT 0,
    `miss_count` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,

    INDEX `attendance_monthly_summary_platform_id_dept_id_month_idx`(`platform_id`, `dept_id`, `month`),
    UNIQUE INDEX `attendance_monthly_summary_employee_id_month_key`(`employee_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_platform` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `owner_id` VARCHAR(191) NULL,

    UNIQUE INDEX `biz_platform_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_shop` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` INTEGER NOT NULL DEFAULT 1,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `owner_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `biz_shop_code_key`(`code`),
    INDEX `biz_shop_platform_id_department_id_status_idx`(`platform_id`, `department_id`, `status`),
    INDEX `biz_shop_sort_idx`(`sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hr_employee` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `gender` INTEGER NULL,
    `age` INTEGER NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `employee_no` VARCHAR(191) NULL,
    `job_no` VARCHAR(191) NULL,
    `department_id` VARCHAR(191) NULL,
    `position_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `manager_employee_id` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `join_date` DATETIME(3) NULL,
    `regularization_date` DATETIME(3) NULL,
    `contract_expire_time` DATETIME(3) NULL,
    `id_card_front_file` VARCHAR(191) NULL,
    `id_card_back_file` VARCHAR(191) NULL,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_phone` VARCHAR(191) NULL,
    `household_registration` VARCHAR(191) NULL,
    `political_status` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `graduate_school` VARCHAR(191) NULL,
    `major` VARCHAR(191) NULL,
    `social_security_city` VARCHAR(191) NULL,

    UNIQUE INDEX `hr_employee_employee_no_key`(`employee_no`),
    UNIQUE INDEX `hr_employee_job_no_key`(`job_no`),
    UNIQUE INDEX `hr_employee_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_record` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `employee_id` VARCHAR(191) NOT NULL,
    `attendance_date` DATETIME(3) NOT NULL,
    `schedule_id` VARCHAR(191) NULL,
    `shift_name` VARCHAR(191) NULL,
    `scheduled_on_duty_time` VARCHAR(191) NULL,
    `scheduled_off_duty_time` VARCHAR(191) NULL,
    `actual_on_duty_time` DATETIME(3) NULL,
    `actual_off_duty_time` DATETIME(3) NULL,
    `on_duty_location` VARCHAR(191) NULL,
    `off_duty_location` VARCHAR(191) NULL,
    `on_duty_status` INTEGER NOT NULL DEFAULT 0,
    `off_duty_status` INTEGER NOT NULL DEFAULT 0,
    `work_duration_minutes` INTEGER NULL,
    `exception_type` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `approval_status` INTEGER NOT NULL DEFAULT 0,
    `approval_time` DATETIME(3) NULL,
    `approval_user_id` VARCHAR(191) NULL,

    INDEX `attendance_record_employee_id_attendance_date_idx`(`employee_id`, `attendance_date`),
    INDEX `attendance_record_platform_id_dept_id_attendance_date_idx`(`platform_id`, `dept_id`, `attendance_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `employee_id` VARCHAR(191) NOT NULL,
    `schedule_date` DATETIME(3) NOT NULL,
    `shift_name` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `publish_time` DATETIME(3) NULL,

    INDEX `attendance_schedule_employee_id_schedule_date_idx`(`employee_id`, `schedule_date`),
    INDEX `attendance_schedule_dept_id_schedule_date_idx`(`dept_id`, `schedule_date`),
    INDEX `attendance_schedule_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `config_key` VARCHAR(191) NOT NULL,
    `config_value` TEXT NOT NULL,
    `remark` TEXT NULL,

    UNIQUE INDEX `sys_config_config_key_key`(`config_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_leave` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `leave_no` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `leave_type` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `duration_hours` DECIMAL(10, 2) NULL,
    `reason` VARCHAR(191) NULL,
    `approval_status` INTEGER NOT NULL DEFAULT 0,
    `approved_by` VARCHAR(191) NULL,
    `approved_time` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `sync_attendance` INTEGER NOT NULL DEFAULT 0,
    `sync_schedule` INTEGER NOT NULL DEFAULT 0,
    `approval_request_id` VARCHAR(191) NULL,
    `approval_request_no` VARCHAR(191) NULL,
    `attachment_urls` JSON NULL,

    UNIQUE INDEX `attendance_leave_leave_no_key`(`leave_no`),
    INDEX `attendance_leave_employee_id_start_time_idx`(`employee_id`, `start_time`),
    INDEX `attendance_leave_approval_status_start_time_idx`(`approval_status`, `start_time`),
    INDEX `attendance_leave_approval_request_id_idx`(`approval_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_overtime` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `overtime_no` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `duration_hours` DECIMAL(10, 2) NULL,
    `reason` VARCHAR(191) NULL,
    `approval_status` INTEGER NOT NULL DEFAULT 0,
    `approved_by` VARCHAR(191) NULL,
    `approved_time` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `sync_attendance` INTEGER NOT NULL DEFAULT 0,
    `sync_schedule` INTEGER NOT NULL DEFAULT 0,
    `approval_request_id` VARCHAR(191) NULL,
    `approval_request_no` VARCHAR(191) NULL,
    `attachment_urls` JSON NULL,

    UNIQUE INDEX `attendance_overtime_overtime_no_key`(`overtime_no`),
    INDEX `attendance_overtime_employee_id_start_time_idx`(`employee_id`, `start_time`),
    INDEX `attendance_overtime_approval_status_start_time_idx`(`approval_status`, `start_time`),
    INDEX `attendance_overtime_approval_request_id_idx`(`approval_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_patch_card` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `patch_no` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `patch_date` DATETIME(3) NOT NULL,
    `patch_type` VARCHAR(191) NOT NULL,
    `target_time` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `approval_status` INTEGER NOT NULL DEFAULT 0,
    `approved_by` VARCHAR(191) NULL,
    `approved_time` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `sync_attendance` INTEGER NOT NULL DEFAULT 0,
    `approval_request_id` VARCHAR(191) NULL,
    `approval_request_no` VARCHAR(191) NULL,
    `attachment_urls` JSON NULL,

    UNIQUE INDEX `attendance_patch_card_patch_no_key`(`patch_no`),
    INDEX `attendance_patch_card_employee_id_patch_date_idx`(`employee_id`, `patch_date`),
    INDEX `attendance_patch_card_approval_status_patch_date_idx`(`approval_status`, `patch_date`),
    INDEX `attendance_patch_card_approval_request_id_idx`(`approval_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_change` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `change_no` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `change_date` DATETIME(3) NOT NULL,
    `before_shift_name` VARCHAR(191) NULL,
    `after_shift_name` VARCHAR(191) NULL,
    `change_type` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `operator_id` VARCHAR(191) NULL,
    `notify_status` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,

    UNIQUE INDEX `attendance_schedule_change_change_no_key`(`change_no`),
    INDEX `attendance_schedule_change_employee_id_change_date_idx`(`employee_id`, `change_date`),
    INDEX `attendance_schedule_change_notify_status_change_date_idx`(`notify_status`, `change_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_staffing_demand` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `shift_name` VARCHAR(191) NOT NULL,
    `required_count` INTEGER NOT NULL DEFAULT 0,
    `expected_volume` INTEGER NULL DEFAULT 0,

    INDEX `attendance_staffing_demand_platform_id_dept_id_date_idx`(`platform_id`, `dept_id`, `date`),
    UNIQUE INDEX `attendance_staffing_demand_dept_id_date_shift_name_is_delete_key`(`dept_id`, `date`, `shift_name`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_message` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `delete_time` DATETIME(3) NULL,
    `is_favorite` INTEGER NOT NULL DEFAULT 0,
    `recipient_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `message_type` VARCHAR(191) NOT NULL,
    `biz_type` VARCHAR(191) NULL,
    `biz_id` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `read_status` INTEGER NOT NULL DEFAULT 0,
    `read_time` DATETIME(3) NULL,
    `sender_id` VARCHAR(191) NULL,
    `sender_name` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `delivery_channels` JSON NULL,

    INDEX `sys_message_recipient_id_read_status_create_time_idx`(`recipient_id`, `read_status`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_external_api_key` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `service_type` VARCHAR(191) NOT NULL,
    `api_key` VARCHAR(512) NOT NULL,
    `api_secret` VARCHAR(512) NULL,
    `endpoint` VARCHAR(512) NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `sys_external_api_key_platform_id_dept_id_service_type_idx`(`platform_id`, `dept_id`, `service_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_api_mapping` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `source_name` VARCHAR(191) NOT NULL,
    `api_endpoint` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'GET',
    `mapping_json` JSON NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `sys_api_mapping_platform_id_source_name_idx`(`platform_id`, `source_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fin_expense_type` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `fin_expense_type_code_platform_id_key`(`code`, `platform_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fin_reimbursement` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `reim_no` VARCHAR(191) NOT NULL,
    `expense_type_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `attachment_urls` JSON NULL,
    `applicant_id` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `approval_request_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `paid_at` DATETIME(3) NULL,
    `pay_method` VARCHAR(191) NULL,
    `remark` TEXT NULL,

    UNIQUE INDEX `fin_reimbursement_reim_no_key`(`reim_no`),
    INDEX `fin_reimbursement_platform_id_dept_id_status_idx`(`platform_id`, `dept_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fin_purchase` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `purchase_no` VARCHAR(191) NOT NULL,
    `items` JSON NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `actual_amount` DECIMAL(10, 2) NULL,
    `reason` TEXT NOT NULL,
    `attachment_urls` JSON NULL,
    `applicant_id` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `approval_request_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `supplier_info` TEXT NULL,
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `fin_purchase_purchase_no_key`(`purchase_no`),
    INDEX `fin_purchase_platform_id_dept_id_status_idx`(`platform_id`, `dept_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fin_cash_record` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `type` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `biz_id` VARCHAR(191) NULL,
    `biz_type` VARCHAR(191) NULL,
    `biz_no` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `operator_id` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `modify_log` JSON NULL,

    INDEX `fin_cash_record_platform_id_dept_id_type_idx`(`platform_id`, `dept_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hr_position` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `level` INTEGER NULL,
    `sequence` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `hr_position_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_rule` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `on_duty_time` VARCHAR(191) NOT NULL,
    `off_duty_time` VARCHAR(191) NOT NULL,
    `late_threshold` INTEGER NOT NULL DEFAULT 0,
    `early_threshold` INTEGER NOT NULL DEFAULT 0,
    `absenteeism_threshold` INTEGER NOT NULL DEFAULT 0,
    `color` VARCHAR(191) NULL,
    `opacity` INTEGER NOT NULL DEFAULT 50,
    `status` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `code` VARCHAR(191) NULL,
    `start_time` VARCHAR(191) NULL,
    `end_time` VARCHAR(191) NULL,
    `work_hours` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_event` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `request_id` VARCHAR(191) NOT NULL,
    `request_no` VARCHAR(191) NOT NULL,
    `biz_type` VARCHAR(191) NULL,
    `biz_id` VARCHAR(191) NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `event_source` VARCHAR(191) NOT NULL,
    `request_status_from` VARCHAR(191) NULL,
    `request_status_to` VARCHAR(191) NULL,
    `biz_status_from` INTEGER NULL,
    `biz_status_to` INTEGER NULL,
    `operator_id` VARCHAR(191) NULL,
    `operator_name` VARCHAR(191) NULL,
    `dedup_key` VARCHAR(191) NULL,
    `external_event_id` VARCHAR(191) NULL,
    `payload` JSON NULL,

    UNIQUE INDEX `approval_event_dedup_key_key`(`dedup_key`),
    INDEX `approval_event_request_id_create_time_idx`(`request_id`, `create_time`),
    INDEX `approval_event_event_type_create_time_idx`(`event_type`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_product_category` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `biz_product_category_code_platform_id_department_id_key`(`code`, `platform_id`, `department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_product` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `images` JSON NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `biz_product_code_key`(`code`),
    INDEX `biz_product_platform_id_department_id_status_idx`(`platform_id`, `department_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_product_sku` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `product_id` VARCHAR(191) NOT NULL,
    `sku_code` VARCHAR(191) NOT NULL,
    `spec_data` JSON NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `warn_stock` INTEGER NOT NULL DEFAULT 5,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `shop_id` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `biz_product_sku_sku_code_key`(`sku_code`),
    INDEX `biz_product_sku_shop_id_status_idx`(`shop_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_session` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_no` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `customer_nickname` VARCHAR(191) NULL,
    `customer_satisfaction` INTEGER NULL,
    `agent_user_id` VARCHAR(191) NULL,
    `agent_name` VARCHAR(191) NULL,
    `group_name` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `transfer_status` VARCHAR(191) NOT NULL DEFAULT 'none',
    `started_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `first_response_at` DATETIME(3) NULL,
    `last_message_at` DATETIME(3) NULL,
    `response_duration_sec` INTEGER NULL,
    `tags` JSON NULL,
    `remark` TEXT NULL,

    UNIQUE INDEX `service_session_session_no_key`(`session_no`),
    INDEX `service_session_platform_id_dept_id_shop_id_status_idx`(`platform_id`, `dept_id`, `shop_id`, `status`),
    INDEX `service_session_agent_user_id_started_at_idx`(`agent_user_id`, `started_at`),
    INDEX `service_session_shop_id_status_idx`(`shop_id`, `status`),
    INDEX `service_session_started_at_status_idx`(`started_at`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_session_message` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `sender_type` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NULL,
    `sender_name` VARCHAR(191) NULL,
    `message_type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `content` TEXT NOT NULL,
    `attachments` JSON NULL,
    `sent_at` DATETIME(3) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `service_session_message_session_id_sent_at_idx`(`session_id`, `sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_rule` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `rule_name` VARCHAR(191) NOT NULL,
    `rule_type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `deduct_score` INTEGER NOT NULL DEFAULT 0,
    `pass_threshold` INTEGER NOT NULL DEFAULT 0,
    `trigger_keywords` JSON NULL,
    `response_timeout_sec` INTEGER NULL,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `service_quality_rule_platform_id_dept_id_shop_id_enabled_sor_idx`(`platform_id`, `dept_id`, `shop_id`, `enabled`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_sensitive_term` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `term` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `severity` INTEGER NOT NULL DEFAULT 1,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `replace_text` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    UNIQUE INDEX `service_sensitive_term_term_platform_id_dept_id_shop_id_key`(`term`, `platform_id`, `dept_id`, `shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_session_analysis` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `triggered_by` VARCHAR(191) NOT NULL DEFAULT 'system',
    `triggered_by_user_id` VARCHAR(191) NULL,
    `quality_score` INTEGER NOT NULL DEFAULT 100,
    `quality_passed` INTEGER NOT NULL DEFAULT 1,
    `loss_risk_level` VARCHAR(191) NOT NULL DEFAULT 'low',
    `loss_risk_score` INTEGER NOT NULL DEFAULT 0,
    `customer_sentiment` VARCHAR(191) NOT NULL DEFAULT 'neutral',
    `response_timeout_count` INTEGER NOT NULL DEFAULT 0,
    `sensitive_hit_count` INTEGER NOT NULL DEFAULT 0,
    `faq_hit_count` INTEGER NOT NULL DEFAULT 0,
    `top_faqs` JSON NULL,
    `sensitive_hits` JSON NULL,
    `triggered_rule_ids` JSON NULL,
    `summary` TEXT NULL,
    `suggestions` JSON NULL,
    `analyzed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `service_session_analysis_session_id_analyzed_at_idx`(`session_id`, `analyzed_at`),
    INDEX `service_session_analysis_platform_id_dept_id_loss_risk_level_idx`(`platform_id`, `dept_id`, `loss_risk_level`),
    INDEX `service_session_analysis_quality_passed_analyzed_at_idx`(`quality_passed`, `analyzed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_record` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `analysis_id` VARCHAR(191) NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `inspector_id` VARCHAR(191) NULL,
    `inspector_name` VARCHAR(191) NULL,
    `inspection_mode` VARCHAR(191) NOT NULL DEFAULT 'auto',
    `score` INTEGER NOT NULL DEFAULT 100,
    `passed` INTEGER NOT NULL DEFAULT 1,
    `violations` JSON NULL,
    `deduct_details` JSON NULL,
    `comment` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `rectification_status` VARCHAR(191) NOT NULL DEFAULT 'not_required',
    `rectification_note` TEXT NULL,
    `inspected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `service_quality_record_session_id_inspected_at_idx`(`session_id`, `inspected_at`),
    INDEX `service_quality_record_platform_id_dept_id_inspected_at_idx`(`platform_id`, `dept_id`, `inspected_at`),
    INDEX `service_quality_record_passed_inspected_at_idx`(`passed`, `inspected_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_satisfaction` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `customer_id` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_at_text` VARCHAR(191) NULL,

    INDEX `service_satisfaction_session_id_rating_idx`(`session_id`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_paper` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `paper_name` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `total_score` INTEGER NOT NULL DEFAULT 100,
    `pass_score` INTEGER NOT NULL DEFAULT 60,
    `duration_min` INTEGER NOT NULL DEFAULT 60,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `exam_paper_platform_id_dept_id_shop_id_enabled_idx`(`platform_id`, `dept_id`, `shop_id`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_paper_question` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `paper_id` VARCHAR(191) NOT NULL,
    `question_type` VARCHAR(191) NOT NULL,
    `title` LONGTEXT NOT NULL,
    `options` JSON NULL,
    `correct_answer` JSON NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `explanation` LONGTEXT NULL,

    INDEX `exam_paper_question_paper_id_sort_idx`(`paper_id`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_plan` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `plan_name` VARCHAR(191) NOT NULL,
    `paper_id` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `reminder_mode` VARCHAR(191) NOT NULL DEFAULT 'notice',
    `force_enter` INTEGER NOT NULL DEFAULT 0,
    `pass_score` INTEGER NOT NULL DEFAULT 60,
    `duration_min` INTEGER NOT NULL DEFAULT 60,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `allow_retake` INTEGER NOT NULL DEFAULT 0,
    `absent_mark_minutes` INTEGER NOT NULL DEFAULT 30,
    `allow_makeup` INTEGER NOT NULL DEFAULT 0,
    `makeup_limit` INTEGER NOT NULL DEFAULT 0,
    `target_dept_ids` JSON NULL,
    `target_employee_ids` JSON NULL,
    `target_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `exam_plan_paper_id_idx`(`paper_id`),
    INDEX `exam_plan_platform_id_dept_id_shop_id_start_time_end_time_idx`(`platform_id`, `dept_id`, `shop_id`, `start_time`, `end_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_assignment` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `plan_id` VARCHAR(191) NOT NULL,
    `paper_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NULL,
    `employee_name` VARCHAR(191) NULL,
    `employee_no` VARCHAR(191) NULL,
    `target_dept_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `score` INTEGER NULL,
    `passed` INTEGER NULL,
    `auto_graded` INTEGER NOT NULL DEFAULT 0,
    `answers` JSON NULL,
    `attempts_history` JSON NULL,
    `manual_absent_marked` INTEGER NOT NULL DEFAULT 0,
    `manual_absent_reason` LONGTEXT NULL,
    `correct_count` INTEGER NOT NULL DEFAULT 0,
    `question_count` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `reminder_mode` VARCHAR(191) NOT NULL DEFAULT 'notice',
    `force_enter` INTEGER NOT NULL DEFAULT 0,

    INDEX `exam_assignment_user_id_status_submitted_at_idx`(`user_id`, `status`, `submitted_at`),
    INDEX `exam_assignment_platform_id_dept_id_shop_id_status_submitted_idx`(`platform_id`, `dept_id`, `shop_id`, `status`, `submitted_at`),
    UNIQUE INDEX `exam_assignment_plan_id_user_id_key`(`plan_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_tag` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `tag_name` VARCHAR(191) NOT NULL,
    `tag_code` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `knowledge_tag_platform_id_dept_id_source_type_sort_idx`(`platform_id`, `dept_id`, `source_type`, `sort`),
    INDEX `knowledge_tag_tag_code_source_type_idx`(`tag_code`, `source_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_loss_inquiry` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `customer_nickname` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `product_id` VARCHAR(191) NULL,
    `product_name` VARCHAR(191) NULL,
    `agent_id` VARCHAR(191) NULL,
    `agent_name` VARCHAR(191) NULL,
    `loss_reason` VARCHAR(191) NULL,
    `recovery_state` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `recovery_remark` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `service_loss_inquiry_platform_id_dept_id_shop_id_recovery_st_idx`(`platform_id`, `dept_id`, `shop_id`, `recovery_state`),
    INDEX `service_loss_inquiry_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_session_tag` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `session_id` VARCHAR(191) NOT NULL,
    `session_no` VARCHAR(191) NOT NULL,
    `tag_name` VARCHAR(191) NOT NULL,
    `tag_type` VARCHAR(191) NOT NULL DEFAULT 'quality',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `reject_reason` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `service_session_tag_platform_id_dept_id_shop_id_status_idx`(`platform_id`, `dept_id`, `shop_id`, `status`),
    INDEX `service_session_tag_session_id_status_idx`(`session_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_faq_mapping` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `faq_content` VARCHAR(191) NOT NULL,
    `article_id` VARCHAR(191) NULL,
    `hit_count` INTEGER NOT NULL DEFAULT 0,
    `faq_type` VARCHAR(191) NULL,
    `product_id` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `service_faq_mapping_platform_id_dept_id_shop_id_faq_type_idx`(`platform_id`, `dept_id`, `shop_id`, `faq_type`),
    INDEX `service_faq_mapping_hit_count_idx`(`hit_count`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_coverage_check` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `check_date` DATETIME(3) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `checked_shift_ids` JSON NOT NULL,
    `checked_shift_names` JSON NOT NULL,
    `total_coverage_hours` DECIMAL(10, 2) NOT NULL,
    `missing_coverage_hours` DECIMAL(10, 2) NOT NULL,
    `overlapping_hours` DECIMAL(10, 2) NOT NULL,
    `missing_details` JSON NULL,
    `overlapping_details` JSON NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,

    INDEX `attendance_coverage_check_platform_id_dept_id_check_date_idx`(`platform_id`, `dept_id`, `check_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_ai_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `conflict_rules` JSON NULL,
    `emp_preferences` JSON NULL,
    `shift_priority` JSON NULL,
    `algorithm_params` JSON NULL,
    `ui_settings` JSON NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `attendance_ai_config_platform_id_dept_id_key`(`platform_id`, `dept_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_mapping_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `mapping_rules` JSON NOT NULL,
    `cleaning_rules` JSON NULL,
    `is_public` INTEGER NOT NULL DEFAULT 1,
    `created_by` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `sys_mapping_template_platform_id_data_type_status_idx`(`platform_id`, `data_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_platform_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `app_key` VARCHAR(191) NULL,
    `app_secret` VARCHAR(191) NULL,
    `api_endpoint` VARCHAR(191) NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `token_expires` DATETIME(3) NULL,
    `extra_params` JSON NULL,
    `is_master` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `sys_platform_config_platform_id_dept_id_shop_id_idx`(`platform_id`, `dept_id`, `shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_order` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `external_order_no` VARCHAR(191) NOT NULL,
    `order_status` VARCHAR(191) NOT NULL,
    `order_amount` DECIMAL(10, 2) NOT NULL,
    `pay_amount` DECIMAL(10, 2) NULL,
    `customer_name` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `order_time` DATETIME(3) NOT NULL,
    `pay_time` DATETIME(3) NULL,
    `raw_data` JSON NULL,
    `sync_status` INTEGER NOT NULL DEFAULT 1,

    INDEX `bi_order_platform_id_dept_id_order_time_idx`(`platform_id`, `dept_id`, `order_time`),
    UNIQUE INDEX `bi_order_platform_id_shop_id_external_order_no_key`(`platform_id`, `shop_id`, `external_order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_product` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `external_spu_id` VARCHAR(191) NOT NULL,
    `product_name` VARCHAR(191) NOT NULL,
    `main_image` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NULL,
    `raw_data` JSON NULL,

    INDEX `bi_product_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
    UNIQUE INDEX `bi_product_platform_id_shop_id_external_spu_id_key`(`platform_id`, `shop_id`, `external_spu_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_cron_job` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `cron_expression` VARCHAR(191) NOT NULL,
    `job_type` VARCHAR(191) NOT NULL,
    `assoc_config_id` VARCHAR(191) NULL,
    `last_run_time` DATETIME(3) NULL,
    `next_run_time` DATETIME(3) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 3,
    `retry_interval` INTEGER NOT NULL DEFAULT 5,
    `current_retry` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `sys_cron_job_job_type_status_next_run_time_idx`(`job_type`, `status`, `next_run_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_integration_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `biz_type` VARCHAR(191) NULL,
    `biz_id` VARCHAR(191) NULL,
    `log_level` VARCHAR(191) NOT NULL DEFAULT 'INFO',
    `message` TEXT NOT NULL,
    `request_payload` JSON NULL,
    `response_data` JSON NULL,
    `error_stack` LONGTEXT NULL,
    `duration_ms` INTEGER NOT NULL DEFAULT 0,
    `error_code` VARCHAR(191) NULL,

    INDEX `sys_integration_log_platform_id_dept_id_create_time_idx`(`platform_id`, `dept_id`, `create_time`),
    INDEX `sys_integration_log_biz_type_biz_id_idx`(`biz_type`, `biz_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_integration_stat` (
    `id` VARCHAR(191) NOT NULL,
    `stat_time` DATETIME(3) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `total_calls` INTEGER NOT NULL DEFAULT 0,
    `success_calls` INTEGER NOT NULL DEFAULT 0,
    `fail_calls` INTEGER NOT NULL DEFAULT 0,
    `avg_duration_ms` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `sys_integration_stat_stat_time_platform_id_dept_id_shop_id_key`(`stat_time`, `platform_id`, `dept_id`, `shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_dashboard_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `platform_ids` JSON NULL,
    `dept_ids` JSON NULL,
    `layout_config` JSON NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_by` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_dashboard_template_name_key`(`name`),
    INDEX `sys_dashboard_template_type_status_idx`(`type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_dashboard_share` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `template_id` VARCHAR(191) NOT NULL,
    `share_token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `sys_dashboard_share_share_token_key`(`share_token`),
    INDEX `sys_dashboard_share_share_token_status_idx`(`share_token`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_dashboard_alert_record` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `template_id` VARCHAR(191) NOT NULL,
    `metric_name` VARCHAR(191) NOT NULL,
    `threshold` DECIMAL(10, 2) NOT NULL,
    `actual_value` DECIMAL(10, 2) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `handle_note` TEXT NULL,
    `handle_user_id` VARCHAR(191) NULL,
    `handle_time` DATETIME(3) NULL,

    INDEX `sys_dashboard_alert_record_template_id_status_create_time_idx`(`template_id`, `status`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_message_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `tpl_type` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `channels` VARCHAR(191) NOT NULL DEFAULT 'internal',
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_by` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_message_template_name_key`(`name`),
    INDEX `sys_message_template_platform_id_dept_id_tpl_type_idx`(`platform_id`, `dept_id`, `tpl_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_message_variable` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `biz_module` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `sys_message_variable_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_history` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `draft_name` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_scheduled` INTEGER NOT NULL DEFAULT 0,
    `warning_count` INTEGER NOT NULL DEFAULT 0,
    `compliance_rate` INTEGER NOT NULL DEFAULT 0,
    `satisfaction_rate` INTEGER NOT NULL DEFAULT 0,
    `fitting_rate` INTEGER NOT NULL DEFAULT 0,
    `applied_by` VARCHAR(191) NOT NULL,
    `applied_at` DATETIME(3) NOT NULL,
    `items_count` INTEGER NOT NULL DEFAULT 0,
    `schedule_data` JSON NULL,
    `config_params` JSON NULL,
    `remark` TEXT NULL,

    INDEX `attendance_schedule_history_platform_id_dept_id_start_date_e_idx`(`platform_id`, `dept_id`, `start_date`, `end_date`),
    INDEX `attendance_schedule_history_applied_at_idx`(`applied_at`),
    INDEX `attendance_schedule_history_mode_idx`(`mode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_prediction` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `predict_date` DATE NOT NULL,
    `shift_name` VARCHAR(191) NOT NULL,
    `predicted_demand` INTEGER NOT NULL DEFAULT 0,
    `confidence_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `based_on_history_count` INTEGER NOT NULL DEFAULT 0,
    `avg_historical_demand` DECIMAL(10, 2) NULL,
    `trend_factor` DECIMAL(5, 2) NULL,
    `prediction_model` VARCHAR(191) NOT NULL DEFAULT 'simple_average',
    `prediction_params` JSON NULL,
    `actual_demand` INTEGER NULL,
    `accuracy_rate` DECIMAL(5, 2) NULL,

    INDEX `attendance_schedule_prediction_platform_id_dept_id_predict_d_idx`(`platform_id`, `dept_id`, `predict_date`),
    INDEX `attendance_schedule_prediction_confidence_score_idx`(`confidence_score`),
    UNIQUE INDEX `attendance_schedule_prediction_dept_id_predict_date_shift_na_key`(`dept_id`, `predict_date`, `shift_name`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_job` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `job_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `config_params` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `result` JSON NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `attendance_schedule_job_job_id_key`(`job_id`),
    INDEX `attendance_schedule_job_user_id_status_create_time_idx`(`user_id`, `status`, `create_time`),
    INDEX `attendance_schedule_job_platform_id_dept_id_status_idx`(`platform_id`, `dept_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_recommendation` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `recommendation_type` VARCHAR(191) NOT NULL,
    `confidence_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `recommendations` JSON NOT NULL,
    `analysis_data` JSON NULL,
    `applied` INTEGER NOT NULL DEFAULT 0,
    `applied_at` DATETIME(3) NULL,
    `applied_by` VARCHAR(191) NULL,

    INDEX `attendance_schedule_recommendation_platform_id_dept_id_recom_idx`(`platform_id`, `dept_id`, `recommendation_type`, `create_time`),
    INDEX `attendance_schedule_recommendation_confidence_score_idx`(`confidence_score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_ml_model` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `shift_name` VARCHAR(191) NOT NULL,
    `model_type` VARCHAR(191) NOT NULL DEFAULT 'simple_moving_average',
    `model_params` JSON NOT NULL,
    `training_data_count` INTEGER NOT NULL DEFAULT 0,
    `accuracy_rate` DECIMAL(5, 2) NULL,
    `last_trained_at` DATETIME(3) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `attendance_schedule_ml_model_model_type_status_idx`(`model_type`, `status`),
    UNIQUE INDEX `attendance_schedule_ml_model_platform_id_dept_id_shift_name__key`(`platform_id`, `dept_id`, `shift_name`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_optimization_result` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `solution_id` VARCHAR(191) NOT NULL,
    `params` JSON NOT NULL,
    `objectives` JSON NOT NULL,
    `total_score` DECIMAL(10, 2) NOT NULL,
    `is_pareto_optimal` INTEGER NOT NULL DEFAULT 0,
    `schedule_data` JSON NULL,
    `applied` INTEGER NOT NULL DEFAULT 0,
    `applied_at` DATETIME(3) NULL,
    `applied_by` VARCHAR(191) NULL,

    INDEX `attendance_schedule_optimization_result_platform_id_dept_id__idx`(`platform_id`, `dept_id`, `create_time`),
    INDEX `attendance_schedule_optimization_result_total_score_idx`(`total_score`),
    INDEX `attendance_schedule_optimization_result_is_pareto_optimal_idx`(`is_pareto_optimal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_schedule_realtime_adjustment` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `adjustment_date` DATE NOT NULL,
    `adjustment_type` VARCHAR(191) NOT NULL,
    `original_employee_id` VARCHAR(191) NULL,
    `new_employee_id` VARCHAR(191) NULL,
    `shift_name` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `applied_at` DATETIME(3) NULL,
    `applied_by` VARCHAR(191) NULL,

    INDEX `attendance_schedule_realtime_adjustment_platform_id_dept_id__idx`(`platform_id`, `dept_id`, `adjustment_date`, `status`),
    INDEX `attendance_schedule_realtime_adjustment_adjustment_type_crea_idx`(`adjustment_type`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_interface_monitor` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `interface_id` VARCHAR(191) NOT NULL,
    `interface_name` VARCHAR(191) NOT NULL,
    `interface_path` VARCHAR(191) NOT NULL,
    `monitor_fields` JSON NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `knowledge_interface_monitor_interface_id_is_deleted_idx`(`interface_id`, `is_deleted`),
    INDEX `knowledge_interface_monitor_sort_is_deleted_idx`(`sort`, `is_deleted`),
    INDEX `knowledge_interface_monitor_platform_id_dept_id_is_deleted_idx`(`platform_id`, `dept_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_interface_monitor_data` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `monitor_id` VARCHAR(191) NOT NULL,
    `interface_id` VARCHAR(191) NOT NULL,
    `response_time` INTEGER NOT NULL,
    `success_rate` DECIMAL(5, 2) NOT NULL,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `error_codes` JSON NULL,
    `data_volume` INTEGER NOT NULL DEFAULT 0,
    `monitor_time` DATETIME(3) NOT NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,

    INDEX `knowledge_interface_monitor_data_monitor_id_monitor_time_idx`(`monitor_id`, `monitor_time`),
    INDEX `knowledge_interface_monitor_data_platform_id_dept_id_is_dele_idx`(`platform_id`, `dept_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_interface_monitor_schedule` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `monitor_id` VARCHAR(191) NOT NULL,
    `schedule_type` VARCHAR(191) NOT NULL,
    `schedule_time` VARCHAR(191) NOT NULL,
    `retention_days` INTEGER NOT NULL DEFAULT 90,
    `notify_users` JSON NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `last_run_time` DATETIME(3) NULL,
    `next_run_time` DATETIME(3) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,

    INDEX `knowledge_interface_monitor_schedule_monitor_id_is_deleted_idx`(`monitor_id`, `is_deleted`),
    INDEX `knowledge_interface_monitor_schedule_next_run_time_status_idx`(`next_run_time`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_activity` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `activity_name` VARCHAR(191) NOT NULL,
    `activity_type` VARCHAR(191) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,

    INDEX `biz_activity_sort_is_deleted_idx`(`sort`, `is_deleted`),
    INDEX `biz_activity_platform_id_dept_id_is_deleted_idx`(`platform_id`, `dept_id`, `is_deleted`),
    INDEX `biz_activity_shop_id_is_deleted_idx`(`shop_id`, `is_deleted`),
    INDEX `biz_activity_start_time_end_time_idx`(`start_time`, `end_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `biz_activity_rule` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `activity_id` VARCHAR(191) NOT NULL,
    `rule_name` VARCHAR(191) NOT NULL,
    `rule_type` VARCHAR(191) NOT NULL,
    `rule_config` JSON NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `biz_activity_rule_activity_id_is_deleted_idx`(`activity_id`, `is_deleted`),
    INDEX `biz_activity_rule_sort_is_deleted_idx`(`sort`, `is_deleted`),
    INDEX `biz_activity_rule_priority_is_deleted_idx`(`priority`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_agent_group` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `group_name` VARCHAR(191) NOT NULL,
    `group_code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `service_agent_group_platform_id_dept_id_is_deleted_idx`(`platform_id`, `dept_id`, `is_deleted`),
    UNIQUE INDEX `service_agent_group_group_code_is_deleted_key`(`group_code`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_agent_group_member` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `group_id` VARCHAR(191) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `agent_name` VARCHAR(191) NOT NULL,
    `agent_phone` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,

    INDEX `service_agent_group_member_group_id_is_deleted_idx`(`group_id`, `is_deleted`),
    INDEX `service_agent_group_member_agent_id_is_deleted_idx`(`agent_id`, `is_deleted`),
    INDEX `service_agent_group_member_sort_is_deleted_idx`(`sort`, `is_deleted`),
    INDEX `service_agent_group_member_priority_is_deleted_idx`(`priority`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_permission_control_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `resource_type` VARCHAR(191) NOT NULL,
    `resource_id` VARCHAR(191) NOT NULL,
    `resource_name` VARCHAR(191) NOT NULL,
    `need_control` INTEGER NOT NULL DEFAULT 1,
    `exception_roles` JSON NULL,

    INDEX `sys_permission_control_config_resource_type_is_deleted_idx`(`resource_type`, `is_deleted`),
    INDEX `sys_permission_control_config_need_control_is_deleted_idx`(`need_control`, `is_deleted`),
    UNIQUE INDEX `sys_permission_control_config_resource_type_resource_id_is_d_key`(`resource_type`, `resource_id`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_permission_config` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `config_key` VARCHAR(191) NOT NULL,
    `config_value` TEXT NOT NULL,
    `config_type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `sys_permission_config_config_key_key`(`config_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_permission_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `template_name` VARCHAR(191) NOT NULL,
    `template_type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `permission_config` JSON NOT NULL,
    `is_default` INTEGER NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,
    `dept_id` VARCHAR(191) NULL,

    INDEX `sys_permission_template_template_type_is_deleted_idx`(`template_type`, `is_deleted`),
    INDEX `sys_permission_template_category_is_deleted_idx`(`category`, `is_deleted`),
    UNIQUE INDEX `sys_permission_template_template_name_is_deleted_key`(`template_name`, `is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hr_employee_history` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `employee_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `event_date` DATETIME(3) NOT NULL,
    `before_data` JSON NULL,
    `after_data` JSON NULL,
    `department_id` VARCHAR(191) NULL,
    `position_id` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `operator_id` VARCHAR(191) NULL,
    `operator_name` VARCHAR(191) NULL,
    `platform_id` VARCHAR(191) NULL,

    INDEX `hr_employee_history_employee_id_event_date_idx`(`employee_id`, `event_date`),
    INDEX `hr_employee_history_event_type_idx`(`event_type`),
    INDEX `hr_employee_history_platform_id_idx`(`platform_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `service_quality_prompt_global` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `applicable_scenarios` TEXT NULL,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `remark` TEXT NULL,

    INDEX `idx_platform_enabled_sort`(`platform_id`, `enabled`, `sort`),
    INDEX `idx_name`(`name`),
    INDEX `idx_create_time`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_prompt_department` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `applicable_scenarios` TEXT NULL,
    `enabled` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NOT NULL,
    `parent_global_prompt_ids` JSON NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,
    `remark` TEXT NULL,

    INDEX `idx_platform_dept_enabled_sort`(`platform_id`, `dept_id`, `enabled`, `sort`),
    INDEX `idx_dept_id`(`dept_id`),
    INDEX `idx_name`(`name`),
    INDEX `idx_create_time`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_prompt_template` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `industry` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `is_builtin` INTEGER NOT NULL DEFAULT 0,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `platform_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `idx_platform_category_industry`(`platform_id`, `category`, `industry`),
    INDEX `idx_sort`(`sort`),
    INDEX `idx_is_builtin`(`is_builtin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_prompt_version` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prompt_id` VARCHAR(191) NOT NULL,
    `prompt_type` VARCHAR(50) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `content_snapshot` TEXT NULL,
    `applicable_scenarios` TEXT NULL,
    `change_description` TEXT NULL,
    `modified_by` VARCHAR(191) NULL,
    `modified_by_name` VARCHAR(255) NULL,

    INDEX `idx_prompt_id_version`(`prompt_id`, `version_number` DESC),
    INDEX `idx_prompt_type`(`prompt_type`),
    INDEX `idx_create_time`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_prompt_permission` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `user_id` VARCHAR(191) NOT NULL,
    `role_code` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(50) NOT NULL,
    `permissions` JSON NOT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,

    INDEX `idx_platform_dept`(`platform_id`, `dept_id`),
    UNIQUE INDEX `service_quality_prompt_permission_user_id_role_code_resource_key`(`user_id`, `role_code`, `resource_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_quality_prompt_audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `operation_type` VARCHAR(50) NOT NULL,
    `operator_id` VARCHAR(191) NOT NULL,
    `operator_name` VARCHAR(255) NOT NULL,
    `prompt_id` VARCHAR(191) NOT NULL,
    `prompt_type` VARCHAR(50) NOT NULL,
    `prompt_name` VARCHAR(255) NOT NULL,
    `before_content` TEXT NULL,
    `after_content` TEXT NULL,
    `delete_reason` TEXT NULL,
    `platform_id` VARCHAR(191) NOT NULL,
    `dept_id` VARCHAR(191) NULL,
    `request_ip` VARCHAR(100) NULL,

    INDEX `idx_operator_time`(`operator_id`, `create_time` DESC),
    INDEX `idx_operation_type_time`(`operation_type`, `create_time` DESC),
    INDEX `idx_prompt_id`(`prompt_id`),
    INDEX `idx_platform_dept`(`platform_id`, `dept_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `idx_scope_status`(`scope_type`, `scope_id`, `status`),
    INDEX `idx_provider_status`(`provider`, `status`),
    UNIQUE INDEX `sys_ai_config_scope_type_scope_id_key`(`scope_type`, `scope_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_file` (
    `id` VARCHAR(191) NOT NULL,
    `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_time` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,
    `original_name` VARCHAR(255) NOT NULL,
    `stored_name` VARCHAR(500) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `extension` VARCHAR(20) NOT NULL,
    `platform_id` VARCHAR(50) NOT NULL,
    `department_id` VARCHAR(50) NULL,
    `category` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` VARCHAR(50) NULL,
    `storage_type` VARCHAR(20) NOT NULL,
    `bucket_name` VARCHAR(100) NULL,
    `is_public` INTEGER NOT NULL DEFAULT 0,
    `access_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `metadata` JSON NULL,
    `uploaded_by` VARCHAR(50) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` VARCHAR(50) NULL,

    INDEX `sys_file_platform_id_department_id_idx`(`platform_id`, `department_id`),
    INDEX `sys_file_category_entity_type_entity_id_idx`(`category`, `entity_type`, `entity_id`),
    INDEX `sys_file_uploaded_by_idx`(`uploaded_by`),
    INDEX `sys_file_status_idx`(`status`),
    INDEX `sys_file_create_time_idx`(`create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `knowledge_chat_message` ADD CONSTRAINT `knowledge_chat_message_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `knowledge_chat_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user` ADD CONSTRAINT `sys_user_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `biz_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_button` ADD CONSTRAINT `sys_button_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `sys_role_menu_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `sys_role_menu_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_role_button` ADD CONSTRAINT `sys_role_button_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_role_button` ADD CONSTRAINT `sys_role_button_button_id_fkey` FOREIGN KEY (`button_id`) REFERENCES `sys_button`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_employee` ADD CONSTRAINT `hr_employee_hr_dept_fkey` FOREIGN KEY (`department_id`) REFERENCES `biz_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_employee` ADD CONSTRAINT `hr_employee_dept_alias_fkey` FOREIGN KEY (`department_id`) REFERENCES `biz_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_employee` ADD CONSTRAINT `hr_employee_position_id_fkey` FOREIGN KEY (`position_id`) REFERENCES `hr_position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_record` ADD CONSTRAINT `attendance_record_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `hr_employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_schedule_change` ADD CONSTRAINT `attendance_schedule_change_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `hr_employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fin_reimbursement` ADD CONSTRAINT `fin_reimbursement_expense_type_id_fkey` FOREIGN KEY (`expense_type_id`) REFERENCES `fin_expense_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_position` ADD CONSTRAINT `hr_position_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `biz_department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `biz_product_sku` ADD CONSTRAINT `biz_product_sku_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `biz_product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_session_message` ADD CONSTRAINT `service_session_message_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `service_session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assignment` ADD CONSTRAINT `exam_assignment_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `exam_plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assignment` ADD CONSTRAINT `exam_assignment_paper_id_fkey` FOREIGN KEY (`paper_id`) REFERENCES `exam_paper`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_mapping_template` ADD CONSTRAINT `sys_mapping_template_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `sys_mapping_template`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sys_user_register` ADD CONSTRAINT `sys_user_register_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `biz_department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user_register` ADD CONSTRAINT `sys_user_register_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
