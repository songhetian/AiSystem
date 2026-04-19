-- 添加质检Prompt管理菜单项
-- 注意: 执行此脚本前,请先查询sys_menu表中"客服管理"或"service"父菜单的ID,并替换下面的 'SERVICE_PARENT_MENU_ID'

-- 1. 添加"智能Prompt管理"父菜单 (如果不存在)
INSERT INTO sys_menu (id, create_time, update_time, is_deleted, menu_name, menu_code, parent_id, icon, route, sort, type, status)
SELECT
  'quality_prompt_parent',
  NOW(),
  NOW(),
  0,
  '智能Prompt管理',
  'service:quality-prompts',
  (SELECT id FROM sys_menu WHERE menu_code = 'service' LIMIT 1),
  'FileTextOutlined',
  NULL,
  40,
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu WHERE menu_code = 'service:quality-prompts'
);

-- 2. 添加"全局Prompt管理"子菜单
INSERT INTO sys_menu (id, create_time, update_time, is_deleted, menu_name, menu_code, parent_id, icon, route, sort, type, status)
SELECT
  'quality_prompt_global',
  NOW(),
  NOW(),
  0,
  '全局Prompt管理',
  'service:quality-prompts:global',
  'quality_prompt_parent',
  'GlobalOutlined',
  '/service/quality-prompts/global',
  1,
  2,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu WHERE menu_code = 'service:quality-prompts:global'
);

-- 3. 添加"部门Prompt管理"子菜单
INSERT INTO sys_menu (id, create_time, update_time, is_deleted, menu_name, menu_code, parent_id, icon, route, sort, type, status)
SELECT
  'quality_prompt_department',
  NOW(),
  NOW(),
  0,
  '部门Prompt管理',
  'service:quality-prompts:department',
  'quality_prompt_parent',
  'TeamOutlined',
  '/service/quality-prompts/department',
  2,
  2,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu WHERE menu_code = 'service:quality-prompts:department'
);

-- 4. 添加"模板库"子菜单
INSERT INTO sys_menu (id, create_time, update_time, is_deleted, menu_name, menu_code, parent_id, icon, route, sort, type, status)
SELECT
  'quality_prompt_templates',
  NOW(),
  NOW(),
  0,
  'Prompt模板库',
  'service:quality-prompts:templates',
  'quality_prompt_parent',
  'AppstoreOutlined',
  '/service/quality-prompts/templates',
  3,
  2,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu WHERE menu_code = 'service:quality-prompts:templates'
);

-- 5. 添加"审计日志"子菜单
INSERT INTO sys_menu (id, create_time, update_time, is_deleted, menu_name, menu_code, parent_id, icon, route, sort, type, status)
SELECT
  'quality_prompt_audit_logs',
  NOW(),
  NOW(),
  0,
  'Prompt审计日志',
  'service:quality-prompts:audit-logs',
  'quality_prompt_parent',
  'AuditOutlined',
  '/service/quality-prompts/audit-logs',
  4,
  2,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu WHERE menu_code = 'service:quality-prompts:audit-logs'
);

-- 6. 为Super Admin角色分配所有菜单权限 (假设Super Admin的role_id为'super_admin')
-- 注意: 请根据实际的Super Admin role_id进行调整
INSERT INTO sys_role_menu (id, create_time, update_time, role_id, menu_id)
SELECT
  CONCAT('role_menu_', menu_code),
  NOW(),
  NOW(),
  (SELECT id FROM sys_role WHERE role_code = 'super_admin' LIMIT 1),
  id
FROM sys_menu
WHERE menu_code IN (
  'service:quality-prompts',
  'service:quality-prompts:global',
  'service:quality-prompts:department',
  'service:quality-prompts:templates',
  'service:quality-prompts:audit-logs'
)
AND NOT EXISTS (
  SELECT 1 FROM sys_role_menu
  WHERE role_id = (SELECT id FROM sys_role WHERE role_code = 'super_admin' LIMIT 1)
  AND menu_id = sys_menu.id
);

-- 7. 为Department Manager角色分配部门Prompt相关菜单权限 (假设role_code为'dept_manager')
-- 注意: 请根据实际的Department Manager role_code进行调整
INSERT INTO sys_role_menu (id, create_time, update_time, role_id, menu_id)
SELECT
  CONCAT('role_menu_dept_', menu_code),
  NOW(),
  NOW(),
  (SELECT id FROM sys_role WHERE role_code = 'dept_manager' LIMIT 1),
  id
FROM sys_menu
WHERE menu_code IN (
  'service:quality-prompts',
  'service:quality-prompts:department',
  'service:quality-prompts:templates',
  'service:quality-prompts:audit-logs'
)
AND EXISTS (SELECT 1 FROM sys_role WHERE role_code = 'dept_manager')
AND NOT EXISTS (
  SELECT 1 FROM sys_role_menu
  WHERE role_id = (SELECT id FROM sys_role WHERE role_code = 'dept_manager' LIMIT 1)
  AND menu_id = sys_menu.id
);

-- 查询结果验证
SELECT
  m.id,
  m.menu_name,
  m.menu_code,
  m.parent_id,
  m.route,
  m.sort,
  m.type,
  m.status,
  p.menu_name as parent_menu_name
FROM sys_menu m
LEFT JOIN sys_menu p ON m.parent_id = p.id
WHERE m.menu_code LIKE 'service:quality-prompts%'
ORDER BY m.sort;
