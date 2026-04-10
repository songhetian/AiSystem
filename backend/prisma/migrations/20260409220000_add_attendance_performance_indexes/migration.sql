CREATE INDEX attendance_record_platform_dept_date_idx ON attendance_record(platform_id, dept_id, attendance_date);
CREATE INDEX attendance_record_stats_idx ON attendance_record(platform_id, dept_id, on_duty_status, off_duty_status, attendance_date);
