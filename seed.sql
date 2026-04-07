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
('seed-menu-system-message', 'Messages', 'system:message', '/system/messages', 16, 1, 1, 0),
('seed-menu-service-session', 'AI Quality', 'service:session', '/service/sessions', 17, 1, 1, 0),
('seed-menu-service-quality-rule', 'Quality Rules', 'service:quality-rule', '/service/quality-rules', 18, 1, 1, 0),
('seed-menu-service-sensitive-term', 'Sensitive Terms', 'service:sensitive-term', '/service/sensitive-terms', 19, 1, 1, 0),
('seed-menu-knowledge-category', 'Knowledge Categories', 'knowledge:category', '/knowledge/categories', 20, 1, 1, 0),
('seed-menu-knowledge-faq-candidate', 'FAQ Candidates', 'knowledge:faq-candidate', '/knowledge/faq-candidates', 21, 1, 1, 0),
('seed-menu-knowledge-article', 'Knowledge Articles', 'knowledge:article', '/knowledge/articles', 22, 1, 1, 0),
('seed-menu-knowledge-tag', 'Knowledge Tags', 'knowledge:tag', '/knowledge/tags', 23, 1, 1, 0)
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
('seed-button-platform-update', 'Update Platform', 'system:platform:update', 'seed-menu-system-platform', 1, 0),
('seed-button-platform-batch-status', 'Batch Update Platform Status', 'system:platform:batch-status', 'seed-menu-system-platform', 1, 0),
('seed-button-platform-delete', 'Delete Platform', 'system:platform:delete', 'seed-menu-system-platform', 1, 0),
('seed-button-department-list', 'View Departments', 'system:department:list', 'seed-menu-system-department', 1, 0),
('seed-button-department-batch-status', 'Batch Update Department Status', 'system:department:batch-status', 'seed-menu-system-department', 1, 0),
('seed-button-shop-list', 'View Shops', 'system:shop:list', 'seed-menu-system-shop', 1, 0),
('seed-button-shop-create', 'Create Shop', 'system:shop:create', 'seed-menu-system-shop', 1, 0),
('seed-button-shop-update', 'Update Shop', 'system:shop:update', 'seed-menu-system-shop', 1, 0),
('seed-button-shop-batch-status', 'Batch Update Shop Status', 'system:shop:batch-status', 'seed-menu-system-shop', 1, 0),
('seed-button-shop-delete', 'Delete Shop', 'system:shop:delete', 'seed-menu-system-shop', 1, 0),
('seed-button-position-list', 'View Positions', 'personnel:position:list', 'seed-menu-personnel-position', 1, 0),
('seed-button-position-create', 'Create Position', 'personnel:position:create', 'seed-menu-personnel-position', 1, 0),
('seed-button-position-update', 'Update Position', 'personnel:position:update', 'seed-menu-personnel-position', 1, 0),
('seed-button-position-delete', 'Delete Position', 'personnel:position:delete', 'seed-menu-personnel-position', 1, 0),
('seed-button-employee-list', 'View Employees', 'personnel:employee:list', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-create', 'Create Employee', 'personnel:employee:create', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-update', 'Update Employee', 'personnel:employee:update', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-delete', 'Delete Employee', 'personnel:employee:delete', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-batch-status', 'Batch Update Status', 'personnel:employee:batch-status', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-id-card-upload', 'Upload ID Card', 'personnel:employee:id-card-upload', 'seed-menu-personnel-employee', 1, 0),
('seed-button-employee-id-card-view', 'View ID Card', 'personnel:employee:id-card-view', 'seed-menu-personnel-employee', 1, 0),
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
('seed-button-system-message-read', 'Read Messages', 'system:message:read', 'seed-menu-system-message', 1, 0),
('seed-button-service-session-list', 'View AI Quality Sessions', 'service:session:list', 'seed-menu-service-session', 1, 0),
('seed-button-service-quality-analyze', 'Analyze AI Quality Session', 'service:quality:analyze', 'seed-menu-service-session', 1, 0),
('seed-button-service-dashboard-view', 'View AI Quality Overview', 'service:dashboard:view', 'seed-menu-service-session', 1, 0),
('seed-button-service-quality-rule-list', 'View Quality Rules', 'service:quality-rule:list', 'seed-menu-service-quality-rule', 1, 0),
('seed-button-service-quality-rule-create', 'Create Quality Rule', 'service:quality-rule:create', 'seed-menu-service-quality-rule', 1, 0),
('seed-button-service-quality-rule-update', 'Update Quality Rule', 'service:quality-rule:update', 'seed-menu-service-quality-rule', 1, 0),
('seed-button-service-sensitive-term-list', 'View Sensitive Terms', 'service:sensitive-term:list', 'seed-menu-service-sensitive-term', 1, 0),
('seed-button-service-sensitive-term-create', 'Create Sensitive Term', 'service:sensitive-term:create', 'seed-menu-service-sensitive-term', 1, 0),
('seed-button-service-sensitive-term-update', 'Update Sensitive Term', 'service:sensitive-term:update', 'seed-menu-service-sensitive-term', 1, 0),
('seed-button-knowledge-category-list', 'View Knowledge Categories', 'knowledge:category:list', 'seed-menu-knowledge-category', 1, 0),
('seed-button-knowledge-category-create', 'Create Knowledge Category', 'knowledge:category:create', 'seed-menu-knowledge-category', 1, 0),
('seed-button-knowledge-category-update', 'Update Knowledge Category', 'knowledge:category:update', 'seed-menu-knowledge-category', 1, 0),
('seed-button-knowledge-faq-candidate-list', 'View FAQ Candidates', 'knowledge:faq-candidate:list', 'seed-menu-knowledge-faq-candidate', 1, 0),
('seed-button-knowledge-article-list', 'View Knowledge Articles', 'knowledge:article:list', 'seed-menu-knowledge-article', 1, 0),
('seed-button-knowledge-article-create', 'Create Knowledge Article', 'knowledge:article:create', 'seed-menu-knowledge-article', 1, 0),
('seed-button-knowledge-article-update', 'Update Knowledge Article', 'knowledge:article:update', 'seed-menu-knowledge-article', 1, 0),
('seed-button-knowledge-tag-list', 'View Knowledge Tags', 'knowledge:tag:list', 'seed-menu-knowledge-tag', 1, 0),
('seed-button-knowledge-tag-create', 'Create Knowledge Tag', 'knowledge:tag:create', 'seed-menu-knowledge-tag', 1, 0),
('seed-button-knowledge-tag-update', 'Update Knowledge Tag', 'knowledge:tag:update', 'seed-menu-knowledge-tag', 1, 0)
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

INSERT INTO `biz_shop` (`id`, `name`, `code`, `type`, `platform_id`, `department_id`, `status`, `is_deleted`)
VALUES ('seed-shop-customer-service', 'Service Demo Shop', 'SHOP-CS-001', 1, 'seed-platform-main', 'seed-department-customer-service', 1, 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `platform_id` = VALUES(`platform_id`),
  `department_id` = VALUES(`department_id`),
  `status` = VALUES(`status`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_quality_rule` (
  `id`, `rule_name`, `rule_type`, `description`, `deduct_score`, `pass_threshold`,
  `trigger_keywords`, `response_timeout_sec`, `enabled`, `sort`,
  `platform_id`, `dept_id`, `shop_id`, `created_by`, `is_deleted`
)
VALUES
('seed-service-quality-rule-1', 'First Response Timeout', 'response_timeout', 'First response must be within 120 seconds', 10, 80, JSON_ARRAY(), 120, 1, 100, 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 'seed-user-admin', 0),
('seed-service-quality-rule-2', 'Forbidden Phrase', 'forbidden_phrase', 'Avoid shirking or hostile phrasing', 15, 80, JSON_ARRAY('推词', '不归我管'), NULL, 1, 90, 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 'seed-user-admin', 0)
ON DUPLICATE KEY UPDATE
  `rule_name` = VALUES(`rule_name`),
  `rule_type` = VALUES(`rule_type`),
  `description` = VALUES(`description`),
  `deduct_score` = VALUES(`deduct_score`),
  `pass_threshold` = VALUES(`pass_threshold`),
  `trigger_keywords` = VALUES(`trigger_keywords`),
  `response_timeout_sec` = VALUES(`response_timeout_sec`),
  `enabled` = VALUES(`enabled`),
  `sort` = VALUES(`sort`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `shop_id` = VALUES(`shop_id`),
  `created_by` = VALUES(`created_by`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_sensitive_term` (
  `id`, `term`, `category`, `severity`, `enabled`, `replace_text`, `description`,
  `platform_id`, `dept_id`, `shop_id`, `created_by`, `is_deleted`
)
VALUES
('seed-service-sensitive-term-1', '推词', 'shirking', 3, 1, '我帮你确认一下', 'Customer service shirking phrase', 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 'seed-user-admin', 0)
ON DUPLICATE KEY UPDATE
  `category` = VALUES(`category`),
  `severity` = VALUES(`severity`),
  `enabled` = VALUES(`enabled`),
  `replace_text` = VALUES(`replace_text`),
  `description` = VALUES(`description`),
  `created_by` = VALUES(`created_by`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_session` (
  `id`, `session_no`, `customer_id`, `customer_nickname`, `customer_satisfaction`,
  `agent_user_id`, `agent_name`, `group_name`,
  `platform_id`, `dept_id`, `shop_id`, `status`, `transfer_status`,
  `started_at`, `ended_at`, `first_response_at`, `last_message_at`, `response_duration_sec`,
  `tags`, `remark`, `is_deleted`
)
VALUES
('seed-service-session-1', 'SESSION-001', 'seed-customer-1', 'Xiao Wang', 2, 'seed-user-admin', 'System Admin', 'Default Group', 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 'closed', 'none', '2026-04-01 09:00:00', '2026-04-01 09:20:00', '2026-04-01 09:05:00', '2026-04-01 09:18:00', 180, JSON_ARRAY('new_customer', 'price_question'), 'AI demo session', 0)
ON DUPLICATE KEY UPDATE
  `customer_nickname` = VALUES(`customer_nickname`),
  `customer_satisfaction` = VALUES(`customer_satisfaction`),
  `agent_user_id` = VALUES(`agent_user_id`),
  `agent_name` = VALUES(`agent_name`),
  `group_name` = VALUES(`group_name`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `shop_id` = VALUES(`shop_id`),
  `status` = VALUES(`status`),
  `transfer_status` = VALUES(`transfer_status`),
  `started_at` = VALUES(`started_at`),
  `ended_at` = VALUES(`ended_at`),
  `first_response_at` = VALUES(`first_response_at`),
  `last_message_at` = VALUES(`last_message_at`),
  `response_duration_sec` = VALUES(`response_duration_sec`),
  `tags` = VALUES(`tags`),
  `remark` = VALUES(`remark`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_session_message` (
  `id`, `session_id`, `session_no`, `sender_type`, `sender_id`, `sender_name`, `message_type`,
  `content`, `attachments`, `sent_at`, `platform_id`, `dept_id`, `shop_id`, `is_deleted`
)
VALUES
('seed-service-message-1', 'seed-service-session-1', 'SESSION-001', 'customer', NULL, 'Xiao Wang', 'text', '你家这个价格还能优惠吗？', NULL, '2026-04-01 09:00:00', 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 0),
('seed-service-message-2', 'seed-service-session-1', 'SESSION-001', 'agent', 'seed-user-admin', 'System Admin', 'text', '这个我先帮你看看，不过这不归我管，你再等等。', NULL, '2026-04-01 09:05:00', 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', 0)
ON DUPLICATE KEY UPDATE
  `content` = VALUES(`content`),
  `sent_at` = VALUES(`sent_at`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `shop_id` = VALUES(`shop_id`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_satisfaction` (
  `id`, `session_id`, `session_no`, `rating`, `label`, `content`, `customer_id`,
  `platform_id`, `dept_id`, `shop_id`, `created_at_text`, `is_deleted`
)
VALUES
('seed-service-satisfaction-1', 'seed-service-session-1', 'SESSION-001', 2, 'Negative', '回复慢，而且话术不太好。', 'seed-customer-1', 'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service', '2026-04-01 09:21:00', 0)
ON DUPLICATE KEY UPDATE
  `rating` = VALUES(`rating`),
  `label` = VALUES(`label`),
  `content` = VALUES(`content`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `shop_id` = VALUES(`shop_id`),
  `created_at_text` = VALUES(`created_at_text`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_session_analysis` (
  `id`, `session_id`, `session_no`, `platform_id`, `dept_id`, `shop_id`,
  `triggered_by`, `triggered_by_user_id`, `quality_score`, `quality_passed`,
  `loss_risk_level`, `loss_risk_score`, `customer_sentiment`,
  `response_timeout_count`, `sensitive_hit_count`, `faq_hit_count`,
  `top_faqs`, `sensitive_hits`, `triggered_rule_ids`, `summary`, `suggestions`,
  `analyzed_at`, `is_deleted`
)
VALUES (
  'seed-service-analysis-1', 'seed-service-session-1', 'SESSION-001',
  'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service',
  'seed', 'seed-user-admin', 65, 0,
  'high', 82, 'negative',
  1, 1, 2,
  JSON_ARRAY(
    JSON_OBJECT('question', 'Can this product price be discounted?', 'count', 6),
    JSON_OBJECT('question', 'When will the order be shipped?', 'count', 4)
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'term', 'not my responsibility',
      'message', 'Let me take a look, but that is not my responsibility right now. Please wait a little longer.',
      'severity', 3
    )
  ),
  JSON_ARRAY('seed-service-quality-rule-1', 'seed-service-quality-rule-2'),
  'The session had a slow first response, negative wording and a high loss risk.',
  JSON_ARRAY('Respond within 120 seconds.', 'Avoid shirking phrases.', 'Use the FAQ answer for discount policy.'),
  '2026-04-01 09:22:00', 0
)
ON DUPLICATE KEY UPDATE
  `quality_score` = VALUES(`quality_score`),
  `quality_passed` = VALUES(`quality_passed`),
  `loss_risk_level` = VALUES(`loss_risk_level`),
  `loss_risk_score` = VALUES(`loss_risk_score`),
  `customer_sentiment` = VALUES(`customer_sentiment`),
  `response_timeout_count` = VALUES(`response_timeout_count`),
  `sensitive_hit_count` = VALUES(`sensitive_hit_count`),
  `faq_hit_count` = VALUES(`faq_hit_count`),
  `top_faqs` = VALUES(`top_faqs`),
  `sensitive_hits` = VALUES(`sensitive_hits`),
  `triggered_rule_ids` = VALUES(`triggered_rule_ids`),
  `summary` = VALUES(`summary`),
  `suggestions` = VALUES(`suggestions`),
  `analyzed_at` = VALUES(`analyzed_at`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `service_quality_record` (
  `id`, `session_id`, `analysis_id`, `session_no`, `inspector_id`, `inspector_name`,
  `inspection_mode`, `score`, `passed`, `violations`, `deduct_details`, `comment`,
  `platform_id`, `dept_id`, `shop_id`, `rectification_status`, `rectification_note`,
  `inspected_at`, `is_deleted`
)
VALUES (
  'seed-service-quality-record-1', 'seed-service-session-1', 'seed-service-analysis-1', 'SESSION-001',
  'seed-user-admin', 'System Admin',
  'auto', 65, 0, JSON_ARRAY('response_timeout', 'forbidden_phrase'),
  JSON_ARRAY(
    JSON_OBJECT('rule_name', 'First Response Timeout', 'deduct_score', 10),
    JSON_OBJECT('rule_name', 'Forbidden Phrase', 'deduct_score', 15)
  ),
  'Follow up training required.',
  'seed-platform-main', 'seed-department-customer-service', 'seed-shop-customer-service',
  'pending', 'Review service script and FAQ answer usage.',
  '2026-04-01 09:23:00', 0
)
ON DUPLICATE KEY UPDATE
  `analysis_id` = VALUES(`analysis_id`),
  `score` = VALUES(`score`),
  `passed` = VALUES(`passed`),
  `violations` = VALUES(`violations`),
  `deduct_details` = VALUES(`deduct_details`),
  `comment` = VALUES(`comment`),
  `rectification_status` = VALUES(`rectification_status`),
  `rectification_note` = VALUES(`rectification_note`),
  `inspected_at` = VALUES(`inspected_at`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `knowledge_category` (
  `id`, `category_name`, `category_code`, `parent_id`, `level`, `sort`, `enabled`,
  `description`, `platform_id`, `dept_id`, `shop_id`, `is_deleted`
)
VALUES (
  'seed-knowledge-category-1',
  'Sales FAQ',
  'sales-faq',
  NULL,
  1,
  10,
  1,
  'High-frequency sales and discount questions',
  'seed-platform-main',
  'seed-department-customer-service',
  'seed-shop-customer-service',
  0
)
ON DUPLICATE KEY UPDATE
  `category_name` = VALUES(`category_name`),
  `sort` = VALUES(`sort`),
  `enabled` = VALUES(`enabled`),
  `description` = VALUES(`description`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `knowledge_tag` (
  `id`, `tag_name`, `tag_code`, `source_type`, `color`, `sort`,
  `platform_id`, `dept_id`, `shop_id`, `created_by`, `is_deleted`
)
VALUES
(
  'seed-knowledge-tag-1',
  '质检通过',
  'quality-pass',
  'service_quality',
  'green',
  10,
  'seed-platform-main',
  'seed-department-customer-service',
  'seed-shop-customer-service',
  'seed-user-admin',
  0
),
(
  'seed-knowledge-tag-2',
  '服务案例',
  'service-case',
  'service_case',
  'purple',
  20,
  'seed-platform-main',
  'seed-department-customer-service',
  'seed-shop-customer-service',
  'seed-user-admin',
  0
)
ON DUPLICATE KEY UPDATE
  `tag_code` = VALUES(`tag_code`),
  `source_type` = VALUES(`source_type`),
  `color` = VALUES(`color`),
  `sort` = VALUES(`sort`),
  `is_deleted` = VALUES(`is_deleted`);

INSERT INTO `knowledge_article` (
  `id`, `title`, `content`, `category_id`, `category_name`, `status`, `author_id`, `author_name`,
  `source_type`, `source_ref`, `keyword`, `platform_id`, `dept_id`, `shop_id`,
  `published_at`, `is_deleted`
)
VALUES (
  'seed-knowledge-article-1',
  'Discount Policy FAQ',
  'Discounts depend on campaign eligibility, product margin and customer segment. Confirm the active promotion before replying.',
  'seed-knowledge-category-1',
  'Sales FAQ',
  'published',
  'seed-user-admin',
  'System Admin',
  'service_faq',
  'seed-service-session-1',
  'Can this product price be discounted?',
  'seed-platform-main',
  'seed-department-customer-service',
  'seed-shop-customer-service',
  '2026-04-01 10:00:00',
  0
)
ON DUPLICATE KEY UPDATE
  `content` = VALUES(`content`),
  `category_id` = VALUES(`category_id`),
  `category_name` = VALUES(`category_name`),
  `status` = VALUES(`status`),
  `author_id` = VALUES(`author_id`),
  `author_name` = VALUES(`author_name`),
  `source_type` = VALUES(`source_type`),
  `source_ref` = VALUES(`source_ref`),
  `keyword` = VALUES(`keyword`),
  `platform_id` = VALUES(`platform_id`),
  `dept_id` = VALUES(`dept_id`),
  `shop_id` = VALUES(`shop_id`),
  `published_at` = VALUES(`published_at`),
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
  'system:message',
  'service:session',
  'service:quality-rule',
  'service:sensitive-term',
  'knowledge:category',
  'knowledge:faq-candidate',
  'knowledge:article',
  'knowledge:tag'
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
  'system:platform:update',
  'system:platform:delete',
  'system:department:list',
  'system:shop:list',
  'system:shop:create',
  'system:shop:update',
  'system:shop:delete',
  'personnel:department:list',
  'personnel:department:create',
  'personnel:department:update',
  'personnel:department:delete',
  'personnel:position:list',
  'personnel:position:create',
  'personnel:position:update',
  'personnel:position:delete',
  'personnel:employee:list',
  'personnel:employee:create',
  'personnel:employee:update',
  'personnel:employee:delete',
  'personnel:employee:batch-status',
  'personnel:employee:id-card-upload',
  'personnel:employee:id-card-view',
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
  'system:message:read',
  'service:session:list',
  'service:quality:analyze',
  'service:dashboard:view',
  'service:quality-rule:list',
  'service:quality-rule:create',
  'service:quality-rule:update',
  'service:sensitive-term:list',
  'service:sensitive-term:create',
  'service:sensitive-term:update',
  'knowledge:category:list',
  'knowledge:category:create',
  'knowledge:category:update',
  'knowledge:faq-candidate:list',
  'knowledge:article:list',
  'knowledge:article:create',
  'knowledge:article:update',
  'knowledge:tag:list',
  'knowledge:tag:create',
  'knowledge:tag:update'
)
WHERE r.`role_code` = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM `sys_role_button` rb WHERE rb.`role_id` = r.`id` AND rb.`button_id` = b.`id`
  );

SET FOREIGN_KEY_CHECKS = 1;
