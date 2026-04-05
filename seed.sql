-- AiSystem MySQL 初始化数据脚本
-- 用途：
--   1. 为纯 SQL 初始化提供管理员、菜单、按钮、角色关系和基础业务演示数据。
--   2. 可与 schema.sql 配合使用：先建表，再写入数据。
--   3. 支持重复执行，已尽量按唯一键做幂等处理。
--
-- 推荐执行方式：
--   npm run seed:import
-- 或
--   npm run db:init:sql
--
-- 说明：
--   1. 管理员账号：admin
--   2. 管理员密码：Admin123456
--   3. 本脚本不写死数据库名，导入脚本会按 .env 中的数据库连接自动选择目标库。

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `sys_role` (`id`, `role_name`, `role_code`, `description`, `status`, `is_deleted`)
VALUES ('seed-role-super-admin', 'Super Admin', 'super_admin', 'Default super administrator', 1, 0)
ON DUPLICATE KEY UPDATE
  `role_name` = VALUES(`role_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `sys_user` (`id`, `username`, `password`, `name`, `status`, `is_deleted`)
VALUES ('seed-user-admin', 'admin', '$2a$10$jUXWaL/l1ZcyWmV4EZjtfuoIGTAa5Si1nnD89Ki90fqF5Yznzg7xu', 'System Admin', 1, 0)
ON DUPLICATE KEY UPDATE
  `password` = VALUES(`password`),
  `name` = VALUES(`name`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `sys_menu` (`id`, `menu_name`, `menu_code`, `route`, `sort`, `type`, `status`, `is_deleted`) VALUES
('seed-menu-system-user', 'Users', 'system:user', '/system/users', 1, 1, 1, 0),
('seed-menu-system-role', 'Roles', 'system:role', '/system/roles', 2, 1, 1, 0),
('seed-menu-system-menu', 'Menus', 'system:menu', '/system/menus', 3, 1, 1, 0),
('seed-menu-system-button', 'Buttons', 'system:button', '/system/buttons', 4, 1, 1, 0),
('seed-menu-system-api', 'APIs', 'system:api', '/system/apis', 5, 1, 1, 0),
('seed-menu-system-platform', 'Platforms', 'system:platform', '/system/platforms', 6, 1, 1, 0),
('seed-menu-system-department', 'Departments', 'system:department', '/system/departments', 7, 1, 1, 0),
('seed-menu-system-shop', 'Shops', 'system:shop', '/system/shops', 8, 1, 1, 0),
('seed-menu-personnel-department', 'HR Departments', 'personnel:department', '/org/departments', 9, 1, 1, 0),
('seed-menu-personnel-position', 'Positions', 'personnel:position', '/org/positions', 10, 1, 1, 0),
('seed-menu-personnel-employee', 'Employees', 'personnel:employee', '/org/employees', 11, 1, 1, 0),
('seed-menu-attendance-schedule', 'Schedules', 'attendance:schedule', '/attendance/schedules', 12, 1, 1, 0),
('seed-menu-attendance-request', 'Attendance Requests', 'attendance:request', '/attendance/requests', 13, 1, 1, 0),
('seed-menu-approval-process', 'Approval Process', 'approval:process', '/approval/process', 14, 1, 1, 0),
('seed-menu-approval-request', 'Approval Center', 'approval:request', '/approval/requests', 15, 1, 1, 0),
('seed-menu-system-message', 'Messages', 'system:message', '/system/messages', 16, 1, 1, 0)
ON DUPLICATE KEY UPDATE
  `menu_name` = VALUES(`menu_name`),
  `route` = VALUES(`route`),
  `sort` = VALUES(`sort`),
  `type` = VALUES(`type`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `sys_button` (`id`, `button_name`, `button_code`, `menu_id`, `status`, `is_deleted`) VALUES
('seed-button-user-list', 'View Users', 'system:user:list', 'seed-menu-system-user', 1, 0),
('seed-button-user-create', 'Create User', 'system:user:create', 'seed-menu-system-user', 1, 0),
('seed-button-user-update', 'Update User', 'system:user:update', 'seed-menu-system-user', 1, 0),
('seed-button-user-delete', 'Delete User', 'system:user:delete', 'seed-menu-system-user', 1, 0),
('seed-button-role-list', 'View Roles', 'system:role:list', 'seed-menu-system-role', 1, 0),
('seed-button-role-create', 'Create Role', 'system:role:create', 'seed-menu-system-role', 1, 0),
('seed-button-menu-list', 'View Menus', 'system:menu:list', 'seed-menu-system-menu', 1, 0),
('seed-button-menu-create', 'Create Menu', 'system:menu:create', 'seed-menu-system-menu', 1, 0),
('seed-button-platform-list', 'View Platforms', 'system:platform:list', 'seed-menu-system-platform', 1, 0),
('seed-button-platform-create', 'Create Platform', 'system:platform:create', 'seed-menu-system-platform', 1, 0),
('seed-button-department-list', 'View Departments', 'system:department:list', 'seed-menu-system-department', 1, 0),
('seed-button-shop-list', 'View Shops', 'system:shop:list', 'seed-menu-system-shop', 1, 0),
('seed-button-shift-list', 'View Shifts', 'attendance:shift:list', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-shift-create', 'Create Shift', 'attendance:shift:create', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-schedule-list', 'View Schedules', 'attendance:schedule:list', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-schedule-assign', 'Assign Schedules', 'attendance:schedule:assign', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-schedule-import', 'Import Schedules', 'attendance:schedule:import', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-schedule-export', 'Export Schedules', 'attendance:schedule:export', 'seed-menu-attendance-schedule', 1, 0),
('seed-button-attendance-request-list', 'View Attendance Requests', 'attendance:request:list', 'seed-menu-attendance-request', 1, 0),
('seed-button-approval-process-list', 'View Approval Process', 'approval:process:list', 'seed-menu-approval-process', 1, 0),
('seed-button-approval-process-update', 'Update Approval Process', 'approval:process:update', 'seed-menu-approval-process', 1, 0),
('seed-button-approval-request-list', 'View Approval Center', 'approval:request:list', 'seed-menu-approval-request', 1, 0),
('seed-button-approval-request-approve', 'Approve Request', 'approval:request:approve', 'seed-menu-approval-request', 1, 0),
('seed-button-approval-request-reject', 'Reject Request', 'approval:request:reject', 'seed-menu-approval-request', 1, 0),
('seed-button-approval-request-transfer', 'Transfer Request', 'approval:request:transfer', 'seed-menu-approval-request', 1, 0),
('seed-button-system-message-list', 'View Messages', 'system:message:list', 'seed-menu-system-message', 1, 0),
('seed-button-system-message-read', 'Read Messages', 'system:message:read', 'seed-menu-system-message', 1, 0)
ON DUPLICATE KEY UPDATE
  `button_name` = VALUES(`button_name`),
  `menu_id` = VALUES(`menu_id`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `biz_platform` (`id`, `name`, `code`, `description`, `status`, `is_deleted`)
VALUES ('seed-platform-main', '默认平台', 'MAIN', '系统初始化平台', 1, 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `biz_department` (`id`, `name`, `code`, `sort`, `status`, `platform_id`, `is_deleted`)
VALUES ('seed-department-customer-service', '客服部', 'CS', 1, 1, 'seed-platform-main', 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `sort` = VALUES(`sort`),
  `status` = VALUES(`status`),
  `platform_id` = VALUES(`platform_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `hr_position` (`id`, `name`, `code`, `description`, `department_id`, `level`, `platform_id`, `is_deleted`)
VALUES ('seed-position-agent', '客服专员', 'CS_AGENT', '默认客服岗位', 'seed-department-customer-service', 1, 'seed-platform-main', 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `department_id` = VALUES(`department_id`),
  `level` = VALUES(`level`),
  `platform_id` = VALUES(`platform_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `hr_employee` (`id`, `name`, `gender`, `phone`, `email`, `employee_no`, `job_no`, `department_id`, `position_id`, `platform_id`, `status`, `join_date`, `is_deleted`)
VALUES ('seed-employee-zhangsan', '张三', 1, '13800000000', 'zhangsan@example.com', 'EMP0001', 'JOB0001', 'seed-department-customer-service', 'seed-position-agent', 'seed-platform-main', 1, NOW(), 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `gender` = VALUES(`gender`),
  `phone` = VALUES(`phone`),
  `email` = VALUES(`email`),
  `department_id` = VALUES(`department_id`),
  `position_id` = VALUES(`position_id`),
  `platform_id` = VALUES(`platform_id`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_rule` (`id`, `name`, `on_duty_time`, `off_duty_time`, `late_threshold`, `early_threshold`, `absenteeism_threshold`, `status`, `platform_id`, `dept_id`, `is_deleted`) VALUES
('seed-shift-day', '白班', '09:00', '18:00', 10, 10, 120, 1, 'seed-platform-main', 'seed-department-customer-service', 0),
('seed-shift-night', '晚班', '13:00', '22:00', 10, 10, 120, 1, 'seed-platform-main', 'seed-department-customer-service', 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `on_duty_time` = VALUES(`on_duty_time`),
  `off_duty_time` = VALUES(`off_duty_time`),
  `late_threshold` = VALUES(`late_threshold`),
  `early_threshold` = VALUES(`early_threshold`),
  `absenteeism_threshold` = VALUES(`absenteeism_threshold`),
  `status` = VALUES(`status`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_schedule` (`id`, `employee_id`, `schedule_date`, `shift_name`, `platform_id`, `dept_id`, `is_deleted`)
VALUES ('seed-schedule-zhangsan-day', 'seed-employee-zhangsan', DATE(NOW()), '白班', 'seed-platform-main', 'seed-department-customer-service', 0)
ON DUPLICATE KEY UPDATE
  `shift_name` = VALUES(`shift_name`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_record` (
  `id`, `employee_id`, `attendance_date`, `schedule_id`, `shift_name`,
  `scheduled_on_duty_time`, `scheduled_off_duty_time`,
  `actual_on_duty_time`, `actual_off_duty_time`,
  `on_duty_location`, `off_duty_location`,
  `on_duty_status`, `off_duty_status`,
  `work_duration_minutes`, `platform_id`, `dept_id`, `is_deleted`
)
VALUES (
  'seed-record-zhangsan-today', 'seed-employee-zhangsan', DATE(NOW()), 'seed-schedule-zhangsan-day', '白班',
  '09:00', '18:00',
  DATE_ADD(DATE(NOW()), INTERVAL 9 HOUR), DATE_ADD(DATE(NOW()), INTERVAL 18 HOUR),
  '总部办公室', '总部办公室',
  1, 1,
  540, 'seed-platform-main', 'seed-department-customer-service', 0
)
ON DUPLICATE KEY UPDATE
  `shift_name` = VALUES(`shift_name`),
  `scheduled_on_duty_time` = VALUES(`scheduled_on_duty_time`),
  `scheduled_off_duty_time` = VALUES(`scheduled_off_duty_time`),
  `actual_on_duty_time` = VALUES(`actual_on_duty_time`),
  `actual_off_duty_time` = VALUES(`actual_off_duty_time`),
  `on_duty_location` = VALUES(`on_duty_location`),
  `off_duty_location` = VALUES(`off_duty_location`),
  `on_duty_status` = VALUES(`on_duty_status`),
  `off_duty_status` = VALUES(`off_duty_status`),
  `work_duration_minutes` = VALUES(`work_duration_minutes`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_leave` (
  `id`, `leave_no`, `employee_id`, `leave_type`, `start_time`, `end_time`,
  `duration_hours`, `reason`, `approval_status`, `approved_by`, `approved_time`,
  `platform_id`, `dept_id`, `sync_attendance`, `sync_schedule`, `attachment_urls`, `is_deleted`
)
VALUES (
  'seed-leave-001', 'LEAVE-001', 'seed-employee-zhangsan', '事假',
  DATE_ADD(DATE(NOW()), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(DATE(NOW()), INTERVAL 1 DAY), INTERVAL 4 HOUR),
  4.00, '家庭事务请假', 1, 'seed-user-admin', NOW(),
  'seed-platform-main', 'seed-department-customer-service', 1, 1, JSON_ARRAY(), 0
)
ON DUPLICATE KEY UPDATE
  `leave_type` = VALUES(`leave_type`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `duration_hours` = VALUES(`duration_hours`),
  `reason` = VALUES(`reason`),
  `approval_status` = VALUES(`approval_status`),
  `approved_by` = VALUES(`approved_by`),
  `approved_time` = VALUES(`approved_time`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `sync_attendance` = VALUES(`sync_attendance`),
  `sync_schedule` = VALUES(`sync_schedule`),
  `attachment_urls` = VALUES(`attachment_urls`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_overtime` (
  `id`, `overtime_no`, `employee_id`, `start_time`, `end_time`,
  `duration_hours`, `reason`, `approval_status`, `approved_by`, `approved_time`,
  `platform_id`, `dept_id`, `sync_attendance`, `sync_schedule`, `attachment_urls`, `is_deleted`
)
VALUES (
  'seed-overtime-001', 'OT-001', 'seed-employee-zhangsan',
  DATE_ADD(DATE(NOW()), INTERVAL 2 DAY), DATE_ADD(DATE_ADD(DATE(NOW()), INTERVAL 2 DAY), INTERVAL 3 HOUR),
  3.00, '活动大促值班', 1, 'seed-user-admin', NOW(),
  'seed-platform-main', 'seed-department-customer-service', 1, 0, JSON_ARRAY(), 0
)
ON DUPLICATE KEY UPDATE
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`),
  `duration_hours` = VALUES(`duration_hours`),
  `reason` = VALUES(`reason`),
  `approval_status` = VALUES(`approval_status`),
  `approved_by` = VALUES(`approved_by`),
  `approved_time` = VALUES(`approved_time`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `sync_attendance` = VALUES(`sync_attendance`),
  `sync_schedule` = VALUES(`sync_schedule`),
  `attachment_urls` = VALUES(`attachment_urls`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_patch_card` (
  `id`, `patch_no`, `employee_id`, `patch_date`, `patch_type`, `target_time`,
  `reason`, `approval_status`, `approved_by`, `approved_time`,
  `platform_id`, `dept_id`, `sync_attendance`, `attachment_urls`, `is_deleted`
)
VALUES (
  'seed-patch-001', 'PATCH-001', 'seed-employee-zhangsan',
  DATE_ADD(DATE(NOW()), INTERVAL -1 DAY), '上班补卡', DATE_ADD(DATE_ADD(DATE(NOW()), INTERVAL -1 DAY), INTERVAL 9 HOUR),
  '早会忘记打卡', 1, 'seed-user-admin', NOW(),
  'seed-platform-main', 'seed-department-customer-service', 1, JSON_ARRAY(), 0
)
ON DUPLICATE KEY UPDATE
  `patch_date` = VALUES(`patch_date`),
  `patch_type` = VALUES(`patch_type`),
  `target_time` = VALUES(`target_time`),
  `reason` = VALUES(`reason`),
  `approval_status` = VALUES(`approval_status`),
  `approved_by` = VALUES(`approved_by`),
  `approved_time` = VALUES(`approved_time`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `sync_attendance` = VALUES(`sync_attendance`),
  `attachment_urls` = VALUES(`attachment_urls`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `attendance_schedule_change` (
  `id`, `change_no`, `employee_id`, `change_date`, `before_shift_name`, `after_shift_name`,
  `change_type`, `reason`, `operator_id`, `notify_status`, `platform_id`, `dept_id`, `is_deleted`
)
VALUES (
  'seed-schedule-change-001', 'SC-001', 'seed-employee-zhangsan', DATE_ADD(DATE(NOW()), INTERVAL 3 DAY),
  '白班', '晚班', 'manual_adjust', '活动期间调班', 'seed-user-admin', 1, 'seed-platform-main', 'seed-department-customer-service', 0
)
ON DUPLICATE KEY UPDATE
  `change_date` = VALUES(`change_date`),
  `before_shift_name` = VALUES(`before_shift_name`),
  `after_shift_name` = VALUES(`after_shift_name`),
  `change_type` = VALUES(`change_type`),
  `reason` = VALUES(`reason`),
  `operator_id` = VALUES(`operator_id`),
  `notify_status` = VALUES(`notify_status`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `sys_message` (
  `id`, `recipient_id`, `title`, `content`, `message_type`, `route`,
  `read_status`, `sender_id`, `sender_name`, `is_deleted`
)
VALUES (
  'seed-message-admin-welcome', 'seed-user-admin',
  'Welcome', 'Message center is ready. Approval and schedule notifications will appear here.',
  'system_notice', '/system/messages',
  0, 'seed-user-admin', 'System Admin', 0
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `message_type` = VALUES(`message_type`),
  `route` = VALUES(`route`),
  `read_status` = VALUES(`read_status`),
  `sender_id` = VALUES(`sender_id`),
  `sender_name` = VALUES(`sender_name`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`)
SELECT 'seed-user-role-admin', u.`id`, r.`id`
FROM `sys_user` u
JOIN `sys_role` r ON r.`role_code` = 'super_admin'
WHERE u.`username` = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_user_role` ur WHERE ur.`user_id` = u.`id` AND ur.`role_id` = r.`id`
  );

INSERT INTO `sys_role_menu` (`id`, `role_id`, `menu_id`)
SELECT CONCAT('seed-role-menu-', m.`menu_code`), r.`id`, m.`id`
FROM `sys_role` r
JOIN `sys_menu` m ON m.`menu_code` IN (
  'system:user',
  'system:role',
  'system:menu',
  'system:button',
  'system:api',
  'system:platform',
  'system:department',
  'system:shop',
  'personnel:department',
  'personnel:position',
  'personnel:employee',
  'attendance:schedule',
  'attendance:request',
  'approval:process',
  'approval:request',
  'system:message'
)
WHERE r.`role_code` = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_menu` rm WHERE rm.`role_id` = r.`id` AND rm.`menu_id` = m.`id`
  );

INSERT INTO `sys_role_button` (`id`, `role_id`, `button_id`)
SELECT CONCAT('seed-role-button-', b.`button_code`), r.`id`, b.`id`
FROM `sys_role` r
JOIN `sys_button` b ON b.`button_code` IN (
  'system:user:list',
  'system:user:create',
  'system:user:update',
  'system:user:delete',
  'system:role:list',
  'system:role:create',
  'system:menu:list',
  'system:menu:create',
  'system:platform:list',
  'system:platform:create',
  'system:department:list',
  'system:shop:list',
  'attendance:shift:list',
  'attendance:shift:create',
  'attendance:schedule:list',
  'attendance:schedule:assign',
  'attendance:schedule:import',
  'attendance:schedule:export',
  'attendance:request:list',
  'approval:process:list',
  'approval:process:update',
  'approval:request:list',
  'approval:request:approve',
  'approval:request:reject',
  'approval:request:transfer',
  'system:message:list',
  'system:message:read'
)
WHERE r.`role_code` = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_button` rb WHERE rb.`role_id` = r.`id` AND rb.`button_id` = b.`id`
  );

SET FOREIGN_KEY_CHECKS = 1;
