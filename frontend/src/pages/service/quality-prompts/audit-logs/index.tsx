import { AuditLogList } from '../components/AuditLogList';

/**
 * 审计日志页面
 * 路由: /service/quality-prompts/audit-logs
 * 权限: service:quality-prompt:audit-log:view
 */
export default function AuditLogsPage() {
  return <AuditLogList />;
}
