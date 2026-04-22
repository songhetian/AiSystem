import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password.util";

const prisma = new PrismaClient();

type MenuDef = {
  menu_name: string;
  menu_code: string;
  route: string;
  sort: number;
  type: number;
};

type ButtonDef = [buttonCode: string, buttonName: string, menuCode: string];
type ApiDef = [apiPath: string, requestMethod: string, apiName: string];

async function upsertApiPermission(
  apiPath: string,
  requestMethod: string,
  apiName: string,
  roleId: string,
) {
  const existing = await prisma.sys_api_permission.findFirst({
    where: { api_path: apiPath, request_method: requestMethod },
  });

  if (existing) {
    return prisma.sys_api_permission.update({
      where: { id: existing.id },
      data: {
        api_name: apiName,
        role_ids: [roleId],
        status: 1,
        is_deleted: 0,
      },
    });
  }

  const conflictedByPath = await prisma.sys_api_permission.findUnique({
    where: { api_path: apiPath },
  });

  if (conflictedByPath) {
    return prisma.sys_api_permission.update({
      where: { id: conflictedByPath.id },
      data: {
        request_method: requestMethod,
        api_name: apiName,
        role_ids: [roleId],
        status: 1,
        is_deleted: 0,
      },
    });
  }

  return prisma.sys_api_permission.create({
    data: {
      api_path: apiPath,
      request_method: requestMethod,
      api_name: apiName,
      role_ids: [roleId],
      status: 1,
    },
  });
}

const menuDefs: MenuDef[] = [
  {
    menu_name: "Users",
    menu_code: "system:user",
    route: "/system/users",
    sort: 1,
    type: 1,
  },
  {
    menu_name: "Roles",
    menu_code: "system:role",
    route: "/system/roles",
    sort: 2,
    type: 1,
  },
  {
    menu_name: "Menus",
    menu_code: "system:menu",
    route: "/system/menus",
    sort: 3,
    type: 1,
  },
  {
    menu_name: "Buttons",
    menu_code: "system:button",
    route: "/system/buttons",
    sort: 4,
    type: 1,
  },
  {
    menu_name: "APIs",
    menu_code: "system:api",
    route: "/system/apis",
    sort: 5,
    type: 1,
  },
  {
    menu_name: "Platforms",
    menu_code: "system:platform",
    route: "/system/platforms",
    sort: 6,
    type: 1,
  },
  {
    menu_name: "Departments",
    menu_code: "system:department",
    route: "/system/departments",
    sort: 7,
    type: 1,
  },
  {
    menu_name: "Shops",
    menu_code: "system:shop",
    route: "/system/shops",
    sort: 8,
    type: 1,
  },
  {
    menu_name: "File Management",
    menu_code: "system:file",
    route: "/system/files",
    sort: 9,
    type: 1,
  },
  {
    menu_name: "AI Configuration",
    menu_code: "system:ai-config",
    route: "/system/ai-config",
    sort: 10,
    type: 1,
  },
  {
    menu_name: "HR Departments",
    menu_code: "personnel:department",
    route: "/org/departments",
    sort: 11,
    type: 1,
  },
  {
    menu_name: "Positions",
    menu_code: "personnel:position",
    route: "/org/positions",
    sort: 11,
    type: 1,
  },
  {
    menu_name: "Employees",
    menu_code: "personnel:employee",
    route: "/org/employees",
    sort: 12,
    type: 1,
  },
  {
    menu_name: "Schedules",
    menu_code: "attendance:schedule",
    route: "/attendance/schedules",
    sort: 13,
    type: 1,
  },
  {
    menu_name: "Attendance Requests",
    menu_code: "attendance:request",
    route: "/attendance/requests",
    sort: 14,
    type: 1,
  },
  {
    menu_name: "Approval Process",
    menu_code: "approval:process",
    route: "/approval/process",
    sort: 15,
    type: 1,
  },
  {
    menu_name: "Approval Center",
    menu_code: "approval:request",
    route: "/approval/requests",
    sort: 16,
    type: 1,
  },
  {
    menu_name: "Messages",
    menu_code: "system:message",
    route: "/system/messages",
    sort: 17,
    type: 1,
  },
  {
    menu_name: "AI Quality",
    menu_code: "service:session",
    route: "/service/sessions",
    sort: 18,
    type: 1,
  },
  {
    menu_name: "Quality Rules",
    menu_code: "service:quality-rule",
    route: "/service/quality-rules",
    sort: 19,
    type: 1,
  },
  {
    menu_name: "Sensitive Terms",
    menu_code: "service:sensitive-term",
    route: "/service/sensitive-terms",
    sort: 20,
    type: 1,
  },
  {
    menu_name: "Knowledge Categories",
    menu_code: "knowledge:category",
    route: "/knowledge/categories",
    sort: 21,
    type: 1,
  },
  {
    menu_name: "FAQ Candidates",
    menu_code: "knowledge:faq-candidate",
    route: "/knowledge/faq-candidates",
    sort: 22,
    type: 1,
  },
  {
    menu_name: "Knowledge Articles",
    menu_code: "knowledge:article",
    route: "/knowledge/articles",
    sort: 23,
    type: 1,
  },
  {
    menu_name: "Exam Papers",
    menu_code: "exam:paper",
    route: "/exam/papers",
    sort: 24,
    type: 1,
  },
  {
    menu_name: "Exam Plans",
    menu_code: "exam:plan",
    route: "/exam/plans",
    sort: 25,
    type: 1,
  },
  {
    menu_name: "My Exams",
    menu_code: "exam:my",
    route: "/exam/my",
    sort: 26,
    type: 1,
  },
  {
    menu_name: "Exam Results",
    menu_code: "exam:result",
    route: "/exam/results",
    sort: 27,
    type: 1,
  },
  {
    menu_name: "Dashboard",
    menu_code: "service:dashboard",
    route: "/service/dashboard",
    sort: 31,
    type: 1,
  },
  {
    menu_name: "Loss Analysis",
    menu_code: "service:loss-analysis",
    route: "/service/loss-analysis",
    sort: 32,
    type: 1,
  },
  {
    menu_name: "FAQ Stats",
    menu_code: "service:faq-stats",
    route: "/service/faq-stats",
    sort: 33,
    type: 1,
  },
  {
    menu_name: "Quality Tags",
    menu_code: "service:quality-tags",
    route: "/service/tags",
    sort: 34,
    type: 1,
  },
  // 质检Prompt管理菜单 (父菜单)
  {
    menu_name: "智能Prompt管理",
    menu_code: "service:quality-prompts",
    route: "",
    sort: 35,
    type: 1,
  },
  // 质检Prompt管理子菜单
  {
    menu_name: "全局Prompt管理",
    menu_code: "service:quality-prompts:global",
    route: "/service/quality-prompts/global",
    sort: 36,
    type: 2,
  },
  {
    menu_name: "部门Prompt管理",
    menu_code: "service:quality-prompts:department",
    route: "/service/quality-prompts/department",
    sort: 37,
    type: 2,
  },
  {
    menu_name: "Prompt模板库",
    menu_code: "service:quality-prompts:templates",
    route: "/service/quality-prompts/templates",
    sort: 38,
    type: 2,
  },
  {
    menu_name: "Prompt审计日志",
    menu_code: "service:quality-prompts:audit-logs",
    route: "/service/quality-prompts/audit-logs",
    sort: 39,
    type: 2,
  },
];

const buttonDefs: ButtonDef[] = [
  ["system:user:list", "View Users", "system:user"],
  ["system:user:create", "Create User", "system:user"],
  ["system:user:assign-role", "Assign Role", "system:user"],
  ["system:user:update", "Update User", "system:user"],
  ["system:user:delete", "Delete User", "system:user"],
  ["system:user:reset-password", "Reset Password", "system:user"],
  ["system:user:batch-status", "Batch Update Status", "system:user"],
  ["system:user:batch-reset-password", "Batch Reset Password", "system:user"],
  ["system:user:batch-assign-roles", "Batch Assign Roles", "system:user"],
  ["system:role:list", "View Roles", "system:role"],
  ["system:role:create", "Create Role", "system:role"],
  ["system:role:assign-permission", "Assign Permission", "system:role"],
  ["system:role:update", "Update Role", "system:role"],
  ["system:role:delete", "Delete Role", "system:role"],
  ["system:role:copy", "Copy Role", "system:role"],
  ["system:menu:list", "View Menus", "system:menu"],
  ["system:menu:create", "Create Menu", "system:menu"],
  ["system:menu:sort", "Sort Menus", "system:menu"],
  ["system:menu:update", "Update Menu", "system:menu"],
  ["system:menu:delete", "Delete Menu", "system:menu"],
  ["system:button:list", "View Buttons", "system:button"],
  ["system:button:create", "Create Button", "system:button"],
  ["system:button:update", "Update Button", "system:button"],
  ["system:button:delete", "Delete Button", "system:button"],
  ["system:api:list", "View APIs", "system:api"],
  ["system:api:create", "Create API", "system:api"],
  ["system:api:update", "Update API", "system:api"],
  ["system:api:delete", "Delete API", "system:api"],
  ["system:platform:list", "View Platforms", "system:platform"],
  ["system:platform:create", "Create Platform", "system:platform"],
  ["system:platform:update", "Update Platform", "system:platform"],
  [
    "system:platform:batch-status",
    "Batch Update Platform Status",
    "system:platform",
  ],
  ["system:platform:delete", "Delete Platform", "system:platform"],
  ["system:department:list", "View Departments", "system:department"],
  ["system:department:create", "Create Department", "system:department"],
  ["system:department:update", "Update Department", "system:department"],
  [
    "system:department:batch-status",
    "Batch Update Department Status",
    "system:department",
  ],
  ["system:department:delete", "Delete Department", "system:department"],
  ["system:shop:list", "View Shops", "system:shop"],
  ["system:shop:create", "Create Shop", "system:shop"],
  ["system:shop:update", "Update Shop", "system:shop"],
  ["system:shop:batch-status", "Batch Update Shop Status", "system:shop"],
  ["system:shop:delete", "Delete Shop", "system:shop"],
  ["personnel:department:list", "View Departments", "personnel:department"],
  ["personnel:department:create", "Create Department", "personnel:department"],
  ["personnel:department:update", "Update Department", "personnel:department"],
  ["personnel:department:delete", "Delete Department", "personnel:department"],
  ["personnel:position:list", "View Positions", "personnel:position"],
  ["personnel:position:create", "Create Position", "personnel:position"],
  ["personnel:position:update", "Update Position", "personnel:position"],
  ["personnel:position:delete", "Delete Position", "personnel:position"],
  ["personnel:employee:list", "View Employees", "personnel:employee"],
  ["personnel:employee:create", "Create Employee", "personnel:employee"],
  ["personnel:employee:update", "Update Employee", "personnel:employee"],
  ["personnel:employee:delete", "Delete Employee", "personnel:employee"],
  [
    "personnel:employee:batch-status",
    "Batch Update Employee Status",
    "personnel:employee",
  ],
  ["personnel:employee:id-card-upload", "Upload ID Card", "personnel:employee"],
  ["personnel:employee:id-card-view", "View ID Card", "personnel:employee"],
  ["attendance:shift:list", "View Shifts", "attendance:schedule"],
  ["attendance:shift:create", "Create Shift", "attendance:schedule"],
  ["attendance:shift:update", "Update Shift", "attendance:schedule"],
  ["attendance:shift:delete", "Delete Shift", "attendance:schedule"],
  ["attendance:schedule:list", "View Schedules", "attendance:schedule"],
  ["attendance:schedule:assign", "Assign Schedule", "attendance:schedule"],
  ["attendance:schedule:import", "Import Schedule", "attendance:schedule"],
  ["attendance:schedule:export", "Export Schedule", "attendance:schedule"],
  ["attendance:request:list", "View Attendance Requests", "attendance:request"],
  ["approval:process:list", "View Approval Process", "approval:process"],
  ["approval:process:update", "Update Approval Process", "approval:process"],
  ["approval:request:list", "View Approval Center", "approval:request"],
  ["approval:request:approve", "Approve Request", "approval:request"],
  ["approval:request:reject", "Reject Request", "approval:request"],
  ["approval:request:transfer", "Transfer Request", "approval:request"],
  ["approval:request:detail", "View Request Detail", "approval:request"],
  ["approval:request:export", "Export Approval Records", "approval:request"],
  ["system:message:list", "View Messages", "system:message"],
  ["system:message:read", "Read Messages", "system:message"],
  ["service:session:list", "View AI Quality Sessions", "service:session"],
  ["service:quality:analyze", "Analyze AI Quality Session", "service:session"],
  ["service:dashboard:view", "View AI Quality Overview", "service:session"],
  ["service:quality-rule:list", "View Quality Rules", "service:quality-rule"],
  [
    "service:quality-rule:create",
    "Create Quality Rule",
    "service:quality-rule",
  ],
  [
    "service:quality-rule:update",
    "Update Quality Rule",
    "service:quality-rule",
  ],
  [
    "service:sensitive-term:list",
    "View Sensitive Terms",
    "service:sensitive-term",
  ],
  [
    "service:sensitive-term:create",
    "Create Sensitive Term",
    "service:sensitive-term",
  ],
  [
    "service:sensitive-term:update",
    "Update Sensitive Term",
    "service:sensitive-term",
  ],
  [
    "knowledge:category:list",
    "View Knowledge Categories",
    "knowledge:category",
  ],
  [
    "knowledge:category:create",
    "Create Knowledge Category",
    "knowledge:category",
  ],
  [
    "knowledge:category:update",
    "Update Knowledge Category",
    "knowledge:category",
  ],
  [
    "knowledge:faq-candidate:list",
    "View FAQ Candidates",
    "knowledge:faq-candidate",
  ],
  ["knowledge:article:list", "View Knowledge Articles", "knowledge:article"],
  ["knowledge:article:create", "Create Knowledge Article", "knowledge:article"],
  ["knowledge:article:update", "Update Knowledge Article", "knowledge:article"],
  ["exam:paper:list", "View Exam Papers", "exam:paper"],
  ["exam:paper:create", "Create Exam Paper", "exam:paper"],
  ["exam:paper:update", "Update Exam Paper", "exam:paper"],
  ["exam:plan:list", "View Exam Plans", "exam:plan"],
  ["exam:plan:create", "Create Exam Plan", "exam:plan"],
  ["exam:my:list", "View My Exams", "exam:my"],
  ["exam:my:submit", "Submit My Exam", "exam:my"],
  ["exam:result:list", "View Exam Results", "exam:result"],
  ["exam:result:manage", "Manage Exam Results", "exam:result"],
  ["exam:result:export", "Export Exam Results", "exam:result"],
  ["service:dashboard:view", "View Dashboard", "service:dashboard"],
  ["service:loss:list", "View Loss Inquiries", "service:loss-analysis"],
  ["service:loss:mark", "Manage Loss Recovery", "service:loss-analysis"],
  ["service:faq:list", "View FAQs", "service:faq-stats"],
  ["service:faq:map", "Map FAQ to Article", "service:faq-stats"],
  ["service:tag:list", "View Quality Tags", "service:quality-tags"],
  ["service:tag:audit", "Audit Quality Tags", "service:quality-tags"],
  ["service:tag:dedup", "Deduplicate Tags", "service:quality-tags"],
  // 质检Prompt管理按钮
  ["service:quality-prompts:global:list", "View Global Prompts", "service:quality-prompts:global"],
  ["service:quality-prompts:global:create", "Create Global Prompt", "service:quality-prompts:global"],
  ["service:quality-prompts:global:update", "Update Global Prompt", "service:quality-prompts:global"],
  ["service:quality-prompts:global:delete", "Delete Global Prompt", "service:quality-prompts:global"],
  ["service:quality-prompts:global:enable", "Enable Global Prompt", "service:quality-prompts:global"],
  ["service:quality-prompts:global:disable", "Disable Global Prompt", "service:quality-prompts:global"],
  ["service:quality-prompts:department:list", "View Department Prompts", "service:quality-prompts:department"],
  ["service:quality-prompts:department:create", "Create Department Prompt", "service:quality-prompts:department"],
  ["service:quality-prompts:department:update", "Update Department Prompt", "service:quality-prompts:department"],
  ["service:quality-prompts:department:delete", "Delete Department Prompt", "service:quality-prompts:department"],
  ["service:quality-prompts:department:enable", "Enable Department Prompt", "service:quality-prompts:department"],
  ["service:quality-prompts:department:disable", "Disable Department Prompt", "service:quality-prompts:department"],
  ["service:quality-prompts:templates:list", "View Prompt Templates", "service:quality-prompts:templates"],
  ["service:quality-prompts:templates:create", "Create Prompt Template", "service:quality-prompts:templates"],
  ["service:quality-prompts:templates:update", "Update Prompt Template", "service:quality-prompts:templates"],
  ["service:quality-prompts:templates:delete", "Delete Prompt Template", "service:quality-prompts:templates"],
  ["service:quality-prompts:audit-logs:list", "View Audit Logs", "service:quality-prompts:audit-logs"],
  ["service:quality-prompts:audit-logs:export", "Export Audit Logs", "service:quality-prompts:audit-logs"],
  ["service:quality-prompts:version:list", "View Version History", "service:quality-prompts:global"],
  ["service:quality-prompts:version:rollback", "Rollback Version", "service:quality-prompts:global"],
  ["service:quality-prompts:batch:enable", "Batch Enable Prompts", "service:quality-prompts:global"],
  ["service:quality-prompts:batch:disable", "Batch Disable Prompts", "service:quality-prompts:global"],
  ["service:quality-prompts:import", "Import Prompts", "service:quality-prompts:global"],
  ["service:quality-prompts:export", "Export Prompts", "service:quality-prompts:global"],
  ["service:quality-prompts:preview", "Preview Prompt", "service:quality-prompts:global"],
  // 文件管理按钮
  ["system:file:list", "View Files", "system:file"],
  ["system:file:upload", "Upload File", "system:file"],
  ["system:file:download", "Download File", "system:file"],
  ["system:file:delete", "Delete File", "system:file"],
  ["system:file:stats", "View Storage Stats", "system:file"],
  // AI配置管理按钮
  ["system:ai-config:list", "View AI Configs", "system:ai-config"],
  ["system:ai-config:create", "Create AI Config", "system:ai-config"],
  ["system:ai-config:edit", "Edit AI Config", "system:ai-config"],
  ["system:ai-config:delete", "Delete AI Config", "system:ai-config"],
  ["system:ai-config:status", "Update AI Config Status", "system:ai-config"],
];

const apiDefs: ApiDef[] = [
  ["/system/users", "GET", "system:user:list"],
  ["/system/users", "POST", "system:user:create"],
  ["/system/users/batch/status", "PATCH", "system:user:batch-status"],
  ["/system/users/:id", "PATCH", "system:user:update"],
  ["/system/users/:id/reset-password", "PATCH", "system:user:reset-password"],
  ["/system/users/:id", "DELETE", "system:user:delete"],
  ["/system/users/profile", "PATCH", "system:user:update"],
  ["/system/users/profile/password", "POST", "system:user:reset-password"],
  ["/system/users/:id/reset-password", "POST", "system:user:reset-password"],
  ["/system/users/batch/reset-password", "POST", "system:user:reset-password"],
  ["/system/users/batch/assign-roles", "POST", "system:user:assign-role"],
  ["/system/roles", "GET", "system:role:list"],
  ["/system/roles", "POST", "system:role:create"],
  ["/system/roles/:id/copy", "POST", "system:role:copy"],
  ["/system/roles/:id", "PATCH", "system:role:update"],
  ["/system/roles/:id", "DELETE", "system:role:delete"],
  ["/system/menus", "GET", "system:menu:list"],
  ["/system/menus", "POST", "system:menu:create"],
  ["/system/menus/tree", "GET", "system:menu:list"],
  ["/system/menus/sort", "POST", "system:menu:sort"],
  ["/system/menus/:id", "PATCH", "system:menu:update"],
  ["/system/menus/:id", "DELETE", "system:menu:delete"],
  ["/system/buttons", "GET", "system:button:list"],
  ["/system/buttons", "POST", "system:button:create"],
  ["/system/buttons/:id", "PATCH", "system:button:update"],
  ["/system/buttons/:id", "DELETE", "system:button:delete"],
  ["/system/apis", "GET", "system:api:list"],
  ["/system/apis", "POST", "system:api:create"],
  ["/system/apis/:id", "PATCH", "system:api:update"],
  ["/system/apis/:id", "DELETE", "system:api:delete"],
  ["/system/platforms", "GET", "system:platform:list"],
  ["/system/platforms", "POST", "system:platform:create"],
  ["/system/platforms/batch/status", "PATCH", "system:platform:batch-status"],
  ["/system/platforms/:id", "PATCH", "system:platform:update"],
  ["/system/platforms/:id", "DELETE", "system:platform:delete"],
  ["/system/departments", "GET", "system:department:list"],
  ["/system/departments/tree", "GET", "system:department:list"],
  ["/system/departments", "POST", "system:department:create"],
  ["/system/departments/:id", "PATCH", "system:department:update"],
  ["/system/departments/:id", "DELETE", "system:department:delete"],
  ["/system/shops", "GET", "system:shop:list"],
  ["/system/shops", "POST", "system:shop:create"],
  ["/system/shops/batch/status", "PATCH", "system:shop:batch-status"],
  ["/system/shops/:id", "PATCH", "system:shop:update"],
  ["/system/shops/:id", "DELETE", "system:shop:delete"],
  ["/personnel/departments", "GET", "personnel:department:list"],
  ["/personnel/departments", "POST", "personnel:department:create"],
  ["/personnel/departments/:id", "PATCH", "personnel:department:update"],
  ["/personnel/departments/:id", "DELETE", "personnel:department:delete"],
  ["/personnel/positions", "GET", "personnel:position:list"],
  ["/personnel/positions", "POST", "personnel:position:create"],
  ["/personnel/positions/:id", "PATCH", "personnel:position:update"],
  ["/personnel/positions/:id", "DELETE", "personnel:position:delete"],
  ["/personnel/employees", "GET", "personnel:employee:list"],
  ["/personnel/employees", "POST", "personnel:employee:create"],
  [
    "/personnel/employees/batch/status",
    "PATCH",
    "personnel:employee:batch-status",
  ],
  ["/personnel/employees/:id", "PATCH", "personnel:employee:update"],
  ["/personnel/employees/:id", "DELETE", "personnel:employee:delete"],
  [
    "/personnel/employees/:id/id-card/:side",
    "POST",
    "personnel:employee:id-card-upload",
  ],
  [
    "/personnel/employees/:id/id-card/:side",
    "GET",
    "personnel:employee:id-card-view",
  ],
  ["/system/permissions/user-roles", "POST", "system:user:assign-role"],
  [
    "/system/permissions/role-resources",
    "POST",
    "system:role:assign-permission",
  ],
  ["/attendance/shifts", "GET", "attendance:shift:list"],
  ["/attendance/shifts", "POST", "attendance:shift:create"],
  ["/attendance/shifts/:id", "PATCH", "attendance:shift:update"],
  ["/attendance/shifts/:id", "DELETE", "attendance:shift:delete"],
  ["/attendance/schedules", "GET", "attendance:schedule:list"],
  ["/attendance/schedules", "POST", "attendance:schedule:assign"],
  ["/attendance/schedules/:id", "DELETE", "attendance:schedule:assign"],
  ["/attendance/schedules/import", "POST", "attendance:schedule:import"],
  ["/attendance/schedules/export", "GET", "attendance:schedule:export"],
  ["/attendance/schedules/template", "GET", "attendance:schedule:import"],
  ["/attendance/records", "GET", "attendance:request:list"],
  ["/attendance/leaves", "GET", "attendance:request:list"],
  ["/attendance/overtimes", "GET", "attendance:request:list"],
  ["/attendance/patch-cards", "GET", "attendance:request:list"],
  ["/attendance/schedule-changes", "GET", "attendance:request:list"],
  ["/approval/templates", "GET", "approval:process:list"],
  ["/approval/templates/:id", "GET", "approval:process:list"],
  ["/approval/templates/:id", "PATCH", "approval:process:update"],
  ["/approval/people", "GET", "approval:request:list"],
  ["/approval/requests", "GET", "approval:request:list"],
  ["/approval/requests/:id/approve", "POST", "approval:request:approve"],
  ["/approval/requests/:id/reject", "POST", "approval:request:reject"],
  ["/approval/requests/:id/transfer", "POST", "approval:request:transfer"],
  ["/approval/templates", "POST", "approval:process:update"],
  ["/approval/templates/:id", "DELETE", "approval:process:update"],
  ["/approval/templates/:id/duplicate", "POST", "approval:process:update"],
  ["/approval/requests/:id", "GET", "approval:request:list"],
  ["/approval/requests/stats", "GET", "approval:request:list"],
  ["/approval/requests/batch/approve", "POST", "approval:request:approve"],
  ["/approval/requests/batch/reject", "POST", "approval:request:reject"],
  ["/approval/requests/export", "GET", "approval:request:list"],
  ["/system/messages", "GET", "system:message:list"],
  ["/system/messages/:id/read", "PATCH", "system:message:read"],
  ["/system/messages/read-all", "PATCH", "system:message:read"],
  ["/service/sessions", "GET", "service:session:list"],
  ["/service/sessions/:id", "GET", "service:session:list"],
  ["/service/sessions/:id/analyze", "POST", "service:quality:analyze"],
  ["/service/ai-overview", "GET", "service:dashboard:view"],
  ["/service/quality-rules", "GET", "service:quality-rule:list"],
  ["/service/quality-rules/create", "POST", "service:quality-rule:create"],
  ["/service/quality-rules/:id", "PUT", "service:quality-rule:update"],
  ["/service/quality-rules/:id/enable", "PATCH", "service:quality-rule:update"],
  [
    "/service/quality-rules/:id/disable",
    "PATCH",
    "service:quality-rule:update",
  ],
  ["/service/sensitive-terms", "GET", "service:sensitive-term:list"],
  ["/service/sensitive-terms/create", "POST", "service:sensitive-term:create"],
  ["/service/sensitive-terms/:id", "PUT", "service:sensitive-term:update"],
  ["/knowledge/categories", "GET", "knowledge:category:list"],
  ["/knowledge/categories", "POST", "knowledge:category:create"],
  ["/knowledge/categories/:id", "PUT", "knowledge:category:update"],
  ["/knowledge/categories/:id/enable", "POST", "knowledge:category:update"],
  ["/knowledge/categories/:id/disable", "POST", "knowledge:category:update"],
  ["/knowledge/articles", "GET", "knowledge:article:list"],
  ["/knowledge/articles", "POST", "knowledge:article:create"],
  ["/knowledge/articles/:id", "PUT", "knowledge:article:update"],
  ["/knowledge/faq-candidates", "GET", "knowledge:faq-candidate:list"],
  ["/exam/papers", "GET", "exam:paper:list"],
  ["/exam/papers/:id", "GET", "exam:paper:list"],
  ["/exam/papers", "POST", "exam:paper:create"],
  ["/exam/papers/:id", "PUT", "exam:paper:update"],
  ["/exam/plans", "GET", "exam:plan:list"],
  ["/exam/plans", "POST", "exam:plan:create"],
  ["/exam/my", "GET", "exam:my:list"],
  ["/exam/my/active", "GET", "exam:my:list"],
  ["/exam/my/:id", "GET", "exam:my:list"],
  ["/exam/my/:id/submit", "POST", "exam:my:submit"],
  ["/exam/results", "GET", "exam:result:list"],
  ["/exam/results/:id/mark-absent", "POST", "exam:result:manage"],
  ["/exam/results/summary", "GET", "exam:result:list"],
  ["/exam/my/stats", "GET", "exam:my:list"],
  ["/exam/plans/:id", "GET", "exam:plan:list"],
  ["/exam/plans/:id/score-distribution", "GET", "exam:plan:list"],
  ["/exam/plans/:id/dept-comparison", "GET", "exam:plan:list"],
  ["/exam/results/:id/manual-grade", "POST", "exam:result:manage"],
  ["/exam/results/question-stats/:planId", "GET", "exam:result:list"],
  ["/exam/results/batch-absent", "POST", "exam:result:manage"],
  ["/exam/results/export", "GET", "exam:result:list"],
  ["/service/dashboard-metrics", "GET", "service:dashboard:view"],
  ["/service/loss-inquiries", "GET", "service:loss:list"],
  ["/service/loss-inquiries/:id/recovery", "PATCH", "service:loss:mark"],
  ["/service/faqs", "GET", "service:faq:list"],
  ["/service/faqs", "POST", "service:faq:map"],
  ["/service/tags/audit", "GET", "service:tag:list"],
  ["/service/tags/audit/confirm", "POST", "service:tag:audit"],
  ["/service/tags/audit/reject", "POST", "service:tag:audit"],
  ["/service/tags/dedup", "POST", "service:tag:dedup"],
  // 质检Prompt管理API
  ["/service/quality-prompts/global", "GET", "service:quality-prompts:global:list"],
  ["/service/quality-prompts/global", "POST", "service:quality-prompts:global:create"],
  ["/service/quality-prompts/global/:id", "GET", "service:quality-prompts:global:list"],
  ["/service/quality-prompts/global/:id", "PUT", "service:quality-prompts:global:update"],
  ["/service/quality-prompts/global/:id", "DELETE", "service:quality-prompts:global:delete"],
  ["/service/quality-prompts/global/:id/enable", "PATCH", "service:quality-prompts:global:enable"],
  ["/service/quality-prompts/global/:id/disable", "PATCH", "service:quality-prompts:global:disable"],
  ["/service/quality-prompts/department", "GET", "service:quality-prompts:department:list"],
  ["/service/quality-prompts/department", "POST", "service:quality-prompts:department:create"],
  ["/service/quality-prompts/department/:id", "GET", "service:quality-prompts:department:list"],
  ["/service/quality-prompts/department/:id", "PUT", "service:quality-prompts:department:update"],
  ["/service/quality-prompts/department/:id", "DELETE", "service:quality-prompts:department:delete"],
  ["/service/quality-prompts/department/:id/enable", "PATCH", "service:quality-prompts:department:enable"],
  ["/service/quality-prompts/department/:id/disable", "PATCH", "service:quality-prompts:department:disable"],
  ["/service/quality-prompts/templates", "GET", "service:quality-prompts:templates:list"],
  ["/service/quality-prompts/templates", "POST", "service:quality-prompts:templates:create"],
  ["/service/quality-prompts/templates/:id", "GET", "service:quality-prompts:templates:list"],
  ["/service/quality-prompts/templates/:id", "PUT", "service:quality-prompts:templates:update"],
  ["/service/quality-prompts/templates/:id", "DELETE", "service:quality-prompts:templates:delete"],
  ["/service/quality-prompts/audit-logs", "GET", "service:quality-prompts:audit-logs:list"],
  ["/service/quality-prompts/audit-logs/export", "GET", "service:quality-prompts:audit-logs:export"],
  ["/service/quality-prompts/:id/versions", "GET", "service:quality-prompts:version:list"],
  ["/service/quality-prompts/:id/versions/:versionId/rollback", "POST", "service:quality-prompts:version:rollback"],
  ["/service/quality-prompts/batch/enable", "POST", "service:quality-prompts:batch:enable"],
  ["/service/quality-prompts/batch/disable", "POST", "service:quality-prompts:batch:disable"],
  ["/service/quality-prompts/import", "POST", "service:quality-prompts:import"],
  ["/service/quality-prompts/export", "GET", "service:quality-prompts:export"],
  ["/service/quality-prompts/preview", "POST", "service:quality-prompts:preview"],
  // 文件管理API
  ["/system/files", "GET", "system:file:list"],
  ["/system/files/upload", "POST", "system:file:upload"],
  ["/system/files/:id/url", "GET", "system:file:download"],
  ["/system/files/:id", "DELETE", "system:file:delete"],
  ["/system/files/stats/platform", "GET", "system:file:stats"],
  ["/system/files/stats/department", "GET", "system:file:stats"],
  ["/system/files/stats/category", "GET", "system:file:stats"],
  // AI配置管理API
  ["/system/ai-config/list", "GET", "system:ai-config:list"],
  ["/system/ai-config/detail/:id", "GET", "system:ai-config:list"],
  ["/system/ai-config/current", "GET", "system:ai-config:list"],
  ["/system/ai-config/upsert", "POST", "system:ai-config:create"],
  ["/system/ai-config/status", "PUT", "system:ai-config:status"],
  ["/system/ai-config/:id", "DELETE", "system:ai-config:delete"],
];

async function main() {
  const adminRole = await prisma.sys_role.upsert({
    where: { role_code: "super_admin" },
    update: {
      role_name: "Super Admin",
      description: "Default super administrator",
      status: 1,
      is_deleted: 0,
    },
    create: {
      id: "seed-role-super-admin",
      role_name: "Super Admin",
      role_code: "super_admin",
      description: "Default super administrator",
      status: 1,
    },
  });

  const menus: Array<{ id: string; menu_code: string }> = [];
  for (const item of menuDefs) {
    // 处理父子菜单关系
    let parent_id = null;
    if (item.menu_code.includes(":") && item.type === 2) {
      // 子菜单,查找父菜单
      const parentCode = item.menu_code.split(":").slice(0, -1).join(":");
      const parentMenu = menus.find((m) => m.menu_code === parentCode);
      if (parentMenu) {
        parent_id = parentMenu.id;
      }
    }

    const menu = await prisma.sys_menu.upsert({
      where: { menu_code: item.menu_code },
      update: { ...item, parent_id, status: 1, is_deleted: 0 },
      create: { ...item, parent_id, status: 1 },
    });
    menus.push({ id: menu.id, menu_code: menu.menu_code });
  }

  const buttons: Array<{ id: string; button_code: string }> = [];
  for (const [buttonCode, buttonName, menuCode] of buttonDefs) {
    const menu = menus.find((item) => item.menu_code === menuCode);
    if (!menu) continue;

    const button = await prisma.sys_button.upsert({
      where: { button_code: buttonCode },
      update: {
        button_name: buttonName,
        menu_id: menu.id,
        status: 1,
        is_deleted: 0,
      },
      create: {
        button_name: buttonName,
        button_code: buttonCode,
        menu_id: menu.id,
        status: 1,
      },
    });

    buttons.push({ id: button.id, button_code: button.button_code });
  }

  for (const [apiPath, requestMethod, apiName] of apiDefs) {
    await upsertApiPermission(apiPath, requestMethod, apiName, adminRole.id);
  }

  const adminPassword = await hashPassword("Admin123456");
  const adminUser = await prisma.sys_user.upsert({
    where: { username: "admin" },
    update: {
      password: adminPassword,
      name: "System Admin",
      status: 1,
      is_deleted: 0,
    },
    create: {
      id: "seed-user-admin",
      username: "admin",
      password: adminPassword,
      name: "System Admin",
      status: 1,
    },
  });

  await prisma.sys_user_role.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });

  for (const menu of menus) {
    await prisma.sys_role_menu.upsert({
      where: {
        role_id_menu_id: {
          role_id: adminRole.id,
          menu_id: menu.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        menu_id: menu.id,
      },
    });
  }

  for (const button of buttons) {
    await prisma.sys_role_button.upsert({
      where: {
        role_id_button_id: {
          role_id: adminRole.id,
          button_id: button.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        button_id: button.id,
      },
    });
  }

  const platform = await prisma.biz_platform.upsert({
    where: { code: "MAIN" },
    update: {
      name: "Main Platform",
      description: "Seeded platform for AI quality inspection",
      owner_id: adminUser.id,
      status: 1,
      is_deleted: 0,
    },
    create: {
      id: "seed-platform-main",
      name: "Main Platform",
      code: "MAIN",
      description: "Seeded platform for AI quality inspection",
      owner_id: adminUser.id,
      status: 1,
    },
  });

  const department = await prisma.biz_department.upsert({
    where: { code: "CS" },
    update: {
      name: "Customer Service",
      sort: 1,
      platform_id: platform.id,
      owner_id: adminUser.id,
      status: 1,
      is_deleted: 0,
    },
    create: {
      id: "seed-department-customer-service",
      name: "Customer Service",
      code: "CS",
      sort: 1,
      platform_id: platform.id,
      owner_id: adminUser.id,
      status: 1,
    },
  });

  const shop = await prisma.biz_shop.upsert({
    where: { code: "SHOP-CS-001" },
    update: {
      name: "Service Demo Shop",
      type: 1,
      platform_id: platform.id,
      department_id: department.id,
      owner_id: adminUser.id,
      status: 1,
      is_deleted: 0,
    },
    create: {
      id: "seed-shop-customer-service",
      name: "Service Demo Shop",
      code: "SHOP-CS-001",
      type: 1,
      platform_id: platform.id,
      department_id: department.id,
      owner_id: adminUser.id,
      status: 1,
    },
  });

  const position = await prisma.hr_position.upsert({
    where: { code: "CS_AGENT" },
    update: {
      name: "Customer Service Agent",
      description: "Seeded service position",
      department_id: department.id,
      level: 1,
      platform_id: platform.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-position-agent",
      name: "Customer Service Agent",
      code: "CS_AGENT",
      description: "Seeded service position",
      department_id: department.id,
      level: 1,
      platform_id: platform.id,
    },
  });

  await prisma.hr_employee.upsert({
    where: { user_id: adminUser.id },
    update: {
      name: "System Admin",
      phone: "13800000000",
      email: "admin@example.com",
      department_id: department.id,
      position_id: position.id,
      platform_id: platform.id,
      status: 1,
      join_date: new Date("2026-04-01T00:00:00.000Z"),
      is_deleted: 0,
    },
    create: {
      id: "seed-employee-admin",
      name: "System Admin",
      phone: "13800000000",
      email: "admin@example.com",
      employee_no: "EMP-CS-001",
      job_no: "JOB-CS-001",
      department_id: department.id,
      position_id: position.id,
      user_id: adminUser.id,
      platform_id: platform.id,
      status: 1,
      join_date: new Date("2026-04-01T00:00:00.000Z"),
    },
  });

  await (prisma as any).service_sensitive_term.upsert({
    where: {
      term_platform_id_dept_id_shop_id: {
        term: "not my responsibility",
        platform_id: platform.id,
        dept_id: department.id,
        shop_id: shop.id,
      },
    },
    update: {
      category: "shirking",
      severity: 3,
      enabled: 1,
      replace_text: "Let me check that for you.",
      description: "Shirking phrase used in customer service",
      created_by: adminUser.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-service-sensitive-term-1",
      term: "not my responsibility",
      category: "shirking",
      severity: 3,
      enabled: 1,
      replace_text: "Let me check that for you.",
      description: "Shirking phrase used in customer service",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_by: adminUser.id,
    },
  });

  await (prisma as any).service_quality_rule.upsert({
    where: { id: "seed-service-quality-rule-1" },
    update: {
      rule_name: "First Response Timeout",
      rule_type: "response_timeout",
      description: "First response must be within 120 seconds",
      deduct_score: 10,
      pass_threshold: 80,
      response_timeout_sec: 120,
      enabled: 1,
      sort: 100,
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_by: adminUser.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-service-quality-rule-1",
      rule_name: "First Response Timeout",
      rule_type: "response_timeout",
      description: "First response must be within 120 seconds",
      deduct_score: 10,
      pass_threshold: 80,
      response_timeout_sec: 120,
      enabled: 1,
      sort: 100,
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_by: adminUser.id,
    },
  });

  await (prisma as any).service_quality_rule.upsert({
    where: { id: "seed-service-quality-rule-2" },
    update: {
      rule_name: "Forbidden Phrase",
      rule_type: "forbidden_phrase",
      description: "Avoid shirking or negative wording",
      deduct_score: 15,
      pass_threshold: 80,
      trigger_keywords: ["not my responsibility", "wait a little longer"],
      enabled: 1,
      sort: 90,
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_by: adminUser.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-service-quality-rule-2",
      rule_name: "Forbidden Phrase",
      rule_type: "forbidden_phrase",
      description: "Avoid shirking or negative wording",
      deduct_score: 15,
      pass_threshold: 80,
      trigger_keywords: ["not my responsibility", "wait a little longer"],
      enabled: 1,
      sort: 90,
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_by: adminUser.id,
    },
  });

  await (prisma as any).service_session.upsert({
    where: { session_no: "SESSION-001" },
    update: {
      customer_id: "seed-customer-1",
      customer_nickname: "Xiao Wang",
      customer_satisfaction: 2,
      agent_user_id: adminUser.id,
      agent_name: adminUser.name,
      group_name: "Default Group",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      status: "closed",
      transfer_status: "none",
      started_at: new Date("2026-04-01T09:00:00.000Z"),
      ended_at: new Date("2026-04-01T09:20:00.000Z"),
      first_response_at: new Date("2026-04-01T09:05:00.000Z"),
      last_message_at: new Date("2026-04-01T09:18:00.000Z"),
      response_duration_sec: 180,
      tags: ["new_customer", "price_question"],
      remark: "Seeded AI quality session",
      is_deleted: 0,
    },
    create: {
      id: "seed-service-session-1",
      session_no: "SESSION-001",
      customer_id: "seed-customer-1",
      customer_nickname: "Xiao Wang",
      customer_satisfaction: 2,
      agent_user_id: adminUser.id,
      agent_name: adminUser.name,
      group_name: "Default Group",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      status: "closed",
      transfer_status: "none",
      started_at: new Date("2026-04-01T09:00:00.000Z"),
      ended_at: new Date("2026-04-01T09:20:00.000Z"),
      first_response_at: new Date("2026-04-01T09:05:00.000Z"),
      last_message_at: new Date("2026-04-01T09:18:00.000Z"),
      response_duration_sec: 180,
      tags: ["new_customer", "price_question"],
      remark: "Seeded AI quality session",
    },
  });

  await (prisma as any).service_session_message.upsert({
    where: { id: "seed-service-message-1" },
    update: {
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      sender_type: "customer",
      sender_name: "Xiao Wang",
      message_type: "text",
      content: "Can this product price be discounted?",
      sent_at: new Date("2026-04-01T09:00:00.000Z"),
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-service-message-1",
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      sender_type: "customer",
      sender_name: "Xiao Wang",
      message_type: "text",
      content: "Can this product price be discounted?",
      sent_at: new Date("2026-04-01T09:00:00.000Z"),
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
    },
  });

  await (prisma as any).service_session_message.upsert({
    where: { id: "seed-service-message-2" },
    update: {
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      sender_type: "agent",
      sender_id: adminUser.id,
      sender_name: adminUser.name,
      message_type: "text",
      content:
        "Let me take a look, but that is not my responsibility right now. Please wait a little longer.",
      sent_at: new Date("2026-04-01T09:05:00.000Z"),
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      is_deleted: 0,
    },
    create: {
      id: "seed-service-message-2",
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      sender_type: "agent",
      sender_id: adminUser.id,
      sender_name: adminUser.name,
      message_type: "text",
      content:
        "Let me take a look, but that is not my responsibility right now. Please wait a little longer.",
      sent_at: new Date("2026-04-01T09:05:00.000Z"),
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
    },
  });

  await (prisma as any).service_satisfaction.upsert({
    where: { id: "seed-service-satisfaction-1" },
    update: {
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      rating: 2,
      label: "Negative",
      content: "Reply was slow and the wording felt unhelpful.",
      customer_id: "seed-customer-1",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_at_text: "2026-04-01 09:21:00",
      is_deleted: 0,
    },
    create: {
      id: "seed-service-satisfaction-1",
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      rating: 2,
      label: "Negative",
      content: "Reply was slow and the wording felt unhelpful.",
      customer_id: "seed-customer-1",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      created_at_text: "2026-04-01 09:21:00",
    },
  });

  await (prisma as any).service_session_analysis.upsert({
    where: { id: "seed-service-analysis-1" },
    update: {
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      triggered_by: "seed",
      triggered_by_user_id: adminUser.id,
      quality_score: 65,
      quality_passed: 0,
      loss_risk_level: "high",
      loss_risk_score: 82,
      customer_sentiment: "negative",
      response_timeout_count: 1,
      sensitive_hit_count: 1,
      faq_hit_count: 2,
      top_faqs: [
        { question: "Can this product price be discounted?", count: 6 },
        { question: "When will the order be shipped?", count: 4 },
      ],
      sensitive_hits: [
        {
          term: "not my responsibility",
          message:
            "Let me take a look, but that is not my responsibility right now. Please wait a little longer.",
          severity: 3,
        },
      ],
      triggered_rule_ids: [
        "seed-service-quality-rule-1",
        "seed-service-quality-rule-2",
      ],
      summary:
        "The session had a slow first response, negative wording and a high loss risk.",
      suggestions: [
        "Respond within 120 seconds.",
        "Avoid shirking phrases.",
        "Use the FAQ answer for discount policy.",
      ],
      analyzed_at: new Date("2026-04-01T09:22:00.000Z"),
      is_deleted: 0,
    },
    create: {
      id: "seed-service-analysis-1",
      session_id: "seed-service-session-1",
      session_no: "SESSION-001",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      triggered_by: "seed",
      triggered_by_user_id: adminUser.id,
      quality_score: 65,
      quality_passed: 0,
      loss_risk_level: "high",
      loss_risk_score: 82,
      customer_sentiment: "negative",
      response_timeout_count: 1,
      sensitive_hit_count: 1,
      faq_hit_count: 2,
      top_faqs: [
        { question: "Can this product price be discounted?", count: 6 },
        { question: "When will the order be shipped?", count: 4 },
      ],
      sensitive_hits: [
        {
          term: "not my responsibility",
          message:
            "Let me take a look, but that is not my responsibility right now. Please wait a little longer.",
          severity: 3,
        },
      ],
      triggered_rule_ids: [
        "seed-service-quality-rule-1",
        "seed-service-quality-rule-2",
      ],
      summary:
        "The session had a slow first response, negative wording and a high loss risk.",
      suggestions: [
        "Respond within 120 seconds.",
        "Avoid shirking phrases.",
        "Use the FAQ answer for discount policy.",
      ],
      analyzed_at: new Date("2026-04-01T09:22:00.000Z"),
    },
  });

  await (prisma as any).service_quality_record.upsert({
    where: { id: "seed-service-quality-record-1" },
    update: {
      session_id: "seed-service-session-1",
      analysis_id: "seed-service-analysis-1",
      session_no: "SESSION-001",
      inspector_id: adminUser.id,
      inspector_name: adminUser.name,
      inspection_mode: "auto",
      score: 65,
      passed: 0,
      violations: ["response_timeout", "forbidden_phrase"],
      deduct_details: [
        { rule_name: "First Response Timeout", deduct_score: 10 },
        { rule_name: "Forbidden Phrase", deduct_score: 15 },
      ],
      comment: "Follow up training required.",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      rectification_status: "pending",
      rectification_note: "Review service script and FAQ answer usage.",
      inspected_at: new Date("2026-04-01T09:23:00.000Z"),
      is_deleted: 0,
    },
    create: {
      id: "seed-service-quality-record-1",
      session_id: "seed-service-session-1",
      analysis_id: "seed-service-analysis-1",
      session_no: "SESSION-001",
      inspector_id: adminUser.id,
      inspector_name: adminUser.name,
      inspection_mode: "auto",
      score: 65,
      passed: 0,
      violations: ["response_timeout", "forbidden_phrase"],
      deduct_details: [
        { rule_name: "First Response Timeout", deduct_score: 10 },
        { rule_name: "Forbidden Phrase", deduct_score: 15 },
      ],
      comment: "Follow up training required.",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      rectification_status: "pending",
      rectification_note: "Review service script and FAQ answer usage.",
      inspected_at: new Date("2026-04-01T09:23:00.000Z"),
    },
  });

  await (prisma as any).knowledge_category.upsert({
    where: {
      category_code_platform_id_dept_id_shop_id: {
        category_code: "sales-faq",
        platform_id: platform.id,
        dept_id: department.id,
        shop_id: shop.id,
      },
    },
    update: {
      category_name: "Sales FAQ",
      sort: 10,
      enabled: 1,
      description: "High-frequency sales and discount questions",
      is_deleted: 0,
    },
    create: {
      id: "seed-knowledge-category-1",
      category_name: "Sales FAQ",
      category_code: "sales-faq",
      level: 1,
      sort: 10,
      enabled: 1,
      description: "High-frequency sales and discount questions",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
    },
  });

  await (prisma as any).knowledge_article.upsert({
    where: { id: "seed-knowledge-article-1" },
    update: {
      title: "Discount Policy FAQ",
      content:
        "Discounts depend on campaign eligibility, product margin and customer segment. Confirm the active promotion before replying.",
      category_id: "seed-knowledge-category-1",
      category_name: "Sales FAQ",
      status: "published",
      author_id: adminUser.id,
      author_name: adminUser.name,
      source_type: "service_faq",
      source_ref: "seed-service-session-1",
      keyword: "Can this product price be discounted?",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      published_at: new Date("2026-04-01T10:00:00.000Z"),
      is_deleted: 0,
    },
    create: {
      id: "seed-knowledge-article-1",
      title: "Discount Policy FAQ",
      content:
        "Discounts depend on campaign eligibility, product margin and customer segment. Confirm the active promotion before replying.",
      category_id: "seed-knowledge-category-1",
      category_name: "Sales FAQ",
      status: "published",
      author_id: adminUser.id,
      author_name: adminUser.name,
      source_type: "service_faq",
      source_ref: "seed-service-session-1",
      keyword: "Can this product price be discounted?",
      platform_id: platform.id,
      dept_id: department.id,
      shop_id: shop.id,
      published_at: new Date("2026-04-01T10:00:00.000Z"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
