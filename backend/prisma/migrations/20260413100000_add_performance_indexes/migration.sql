-- 性能优化索引迁移
-- 创建时间: 2026-04-13
-- 说明: 根据全量服务层扫描，补充缺失的查询索引，提升高频查询性能

-- ============================================================
-- 1. service_session 表 - 补充按 shop_id+status 和时间范围查询索引
-- ============================================================
CREATE INDEX `service_session_shop_status_idx`
  ON `service_session` (`shop_id`, `status`);

CREATE INDEX `service_session_started_at_status_idx`
  ON `service_session` (`started_at`, `status`);

-- ============================================================
-- 2. service_session_analysis 表 - 补充按平台/部门/风险等级查询索引
-- ============================================================
CREATE INDEX `service_session_analysis_platform_dept_risk_idx`
  ON `service_session_analysis` (`platform_id`, `dept_id`, `loss_risk_level`);

CREATE INDEX `service_session_analysis_quality_passed_idx`
  ON `service_session_analysis` (`quality_passed`, `analyzed_at`);

-- ============================================================
-- 3. sys_operation_log 表 - 补充 username 查询索引
-- ============================================================
CREATE INDEX `sys_operation_log_username_create_time_idx`
  ON `sys_operation_log` (`username`, `create_time`);

-- ============================================================
-- 4. service_quality_record 表 - 补充平台/部门查询索引
-- ============================================================
CREATE INDEX `service_quality_record_platform_dept_idx`
  ON `service_quality_record` (`platform_id`, `dept_id`, `inspected_at`);

CREATE INDEX `service_quality_record_passed_idx`
  ON `service_quality_record` (`passed`, `inspected_at`);
