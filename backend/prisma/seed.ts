import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

async function upsertApiPermission(apiPath: string, requestMethod: string, apiName: string, roleId: string) {
  const existing = await prisma.sys_api_permission.findFirst({
    where: { api_path: apiPath, request_method: requestMethod }
  });

  if (existing) {
    return prisma.sys_api_permission.update({
      where: { id: existing.id },
      data: {
        api_name: apiName,
        role_ids: [roleId],
        status: 1,
        is_deleted: 0
      }
    });
  }

  const conflictedByPath = await prisma.sys_api_permission.findUnique({
    where: { api_path: apiPath }
  });

  if (conflictedByPath) {
    return prisma.sys_api_permission.update({
      where: { id: conflictedByPath.id },
      data: {
        request_method: requestMethod,
        api_name: apiName,
        role_ids: [roleId],
        status: 1,
        is_deleted: 0
      }
    });
  }

  return prisma.sys_api_permission.create({
    data: {
      api_path: apiPath,
      request_method: requestMethod,
      api_name: apiName,
      role_ids: [roleId],
      status: 1
    }
  });
}

async function main() {
  const adminRole = await prisma.sys_role.upsert({
    where: { role_code: 'super_admin' },
    update: {
      role_name: '超级管理员',
      description: '系统默认超级管理员角色',
      status: 1,
      is_deleted: 0
    },
    create: {
      role_name: '超级管理员',
      role_code: 'super_admin',
      description: '系统默认超级管理员角色',
      status: 1
    }
  });

  const menuDefs = [
    { menu_name: '用户管理', menu_code: 'system:user', route: '/system/users', sort: 1, type: 1 },
    { menu_name: '角色管理', menu_code: 'system:role', route: '/system/roles', sort: 2, type: 1 },
    { menu_name: '菜单管理', menu_code: 'system:menu', route: '/system/menus', sort: 3, type: 1 },
    { menu_name: '按钮管理', menu_code: 'system:button', route: '/system/buttons', sort: 4, type: 1 },
    { menu_name: '接口管理', menu_code: 'system:api', route: '/system/apis', sort: 5, type: 1 },
    { menu_name: '平台管理', menu_code: 'system:platform', route: '/system/platforms', sort: 6, type: 1 },
    { menu_name: '业务部门', menu_code: 'system:department', route: '/system/departments', sort: 7, type: 1 },
    { menu_name: '店铺管理', menu_code: 'system:shop', route: '/system/shops', sort: 8, type: 1 },
    { menu_name: '组织架构', menu_code: 'personnel:department', route: '/org/departments', sort: 9, type: 1 },
    { menu_name: '岗位管理', menu_code: 'personnel:position', route: '/org/positions', sort: 10, type: 1 },
    { menu_name: '员工管理', menu_code: 'personnel:employee', route: '/org/employees', sort: 11, type: 1 },
    { menu_name: '排班管理', menu_code: 'attendance:schedule', route: '/attendance/schedules', sort: 12, type: 1 },
    { menu_name: '考勤申请', menu_code: 'attendance:request', route: '/attendance/requests', sort: 13, type: 1 },
    { menu_name: '审批流程', menu_code: 'approval:process', route: '/approval/process', sort: 14, type: 1 },
    { menu_name: '审批中心', menu_code: 'approval:request', route: '/approval/requests', sort: 15, type: 1 },
    { menu_name: '站内消息', menu_code: 'system:message', route: '/system/messages', sort: 16, type: 1 }
  ];

  const menus: any[] = [];
  for (const item of menuDefs) {
    menus.push(
      await prisma.sys_menu.upsert({
        where: { menu_code: item.menu_code },
        update: { ...item, status: 1 },
        create: { ...item, status: 1 }
      })
    );
  }

  const buttonDefs = [
    ['system:user:list', '查看用户', 'system:user'],
    ['system:user:create', '新增用户', 'system:user'],
    ['system:user:assign-role', '分配角色', 'system:user'],
    ['system:user:update', '编辑用户', 'system:user'],
    ['system:user:delete', '删除用户', 'system:user'],
    ['system:user:reset-password', '重置密码', 'system:user'],
    ['system:user:batch-status', '批量修改状态', 'system:user'],
    ['system:role:list', '查看角色', 'system:role'],
    ['system:role:create', '新增角色', 'system:role'],
    ['system:role:assign-permission', '分配权限', 'system:role'],
    ['system:role:update', '编辑角色', 'system:role'],
    ['system:role:delete', '删除角色', 'system:role'],
    ['system:role:copy', '复制角色', 'system:role'],
    ['system:menu:list', '查看菜单', 'system:menu'],
    ['system:menu:create', '新增菜单', 'system:menu'],
    ['system:menu:sort', '菜单排序', 'system:menu'],
    ['system:menu:update', '编辑菜单', 'system:menu'],
    ['system:menu:delete', '删除菜单', 'system:menu'],
    ['system:button:list', '查看按钮', 'system:button'],
    ['system:button:create', '新增按钮', 'system:button'],
    ['system:button:update', '编辑按钮', 'system:button'],
    ['system:button:delete', '删除按钮', 'system:button'],
    ['system:api:list', '查看接口', 'system:api'],
    ['system:api:create', '新增接口', 'system:api'],
    ['system:api:update', '编辑接口', 'system:api'],
    ['system:api:delete', '删除接口', 'system:api'],
    ['system:platform:list', '查看平台', 'system:platform'],
    ['system:platform:create', '新增平台', 'system:platform'],
    ['system:platform:update', '编辑平台', 'system:platform'],
    ['system:platform:delete', '删除平台', 'system:platform'],
    ['system:department:list', '查看部门', 'system:department'],
    ['system:department:create', '新增部门', 'system:department'],
    ['system:department:update', '编辑部门', 'system:department'],
    ['system:department:delete', '删除部门', 'system:department'],
    ['system:shop:list', '查看店铺', 'system:shop'],
    ['system:shop:create', '新增店铺', 'system:shop'],
    ['system:shop:update', '编辑店铺', 'system:shop'],
    ['system:shop:delete', '删除店铺', 'system:shop'],
    ['attendance:shift:list', '查看班次', 'attendance:schedule'],
    ['attendance:shift:create', '新增班次', 'attendance:schedule'],
    ['attendance:shift:update', '编辑班次', 'attendance:schedule'],
    ['attendance:shift:delete', '删除班次', 'attendance:schedule'],
    ['attendance:schedule:list', '查看排班', 'attendance:schedule'],
    ['attendance:schedule:assign', '安排排班', 'attendance:schedule'],
    ['attendance:schedule:import', '导入排班', 'attendance:schedule'],
    ['attendance:schedule:export', '导出排班', 'attendance:schedule'],
    ['attendance:request:list', '查看考勤申请', 'attendance:request'],
    ['approval:process:list', '查看审批流程', 'approval:process'],
    ['approval:process:update', '编辑审批流程', 'approval:process'],
    ['approval:request:list', '查看审批中心', 'approval:request'],
    ['approval:request:approve', '审批通过', 'approval:request'],
    ['approval:request:reject', '审批驳回', 'approval:request'],
    ['approval:request:transfer', '转审处理', 'approval:request'],
    ['system:message:list', '查看站内消息', 'system:message'],
    ['system:message:read', '标记消息已读', 'system:message']
  ] as const;

  const buttons: any[] = [];
  for (const [buttonCode, buttonName, menuCode] of buttonDefs) {
    const menu = menus.find((item) => item.menu_code === menuCode);
    if (!menu) continue;

    buttons.push(
      await prisma.sys_button.upsert({
        where: { button_code: buttonCode },
        update: {
          button_name: buttonName,
          menu_id: menu.id,
          status: 1
        },
        create: {
          button_name: buttonName,
          button_code: buttonCode,
          menu_id: menu.id,
          status: 1
        }
      })
    );
  }

  const apiDefs = [
    ['/system/users', 'GET', 'system:user:list'],
    ['/system/users', 'POST', 'system:user:create'],
    ['/system/users/batch/status', 'PATCH', 'system:user:batch-status'],
    ['/system/users/:id', 'PATCH', 'system:user:update'],
    ['/system/users/:id/reset-password', 'PATCH', 'system:user:reset-password'],
    ['/system/users/:id', 'DELETE', 'system:user:delete'],
    ['/system/roles', 'GET', 'system:role:list'],
    ['/system/roles', 'POST', 'system:role:create'],
    ['/system/roles/:id/copy', 'POST', 'system:role:copy'],
    ['/system/roles/:id', 'PATCH', 'system:role:update'],
    ['/system/roles/:id', 'DELETE', 'system:role:delete'],
    ['/system/menus', 'GET', 'system:menu:list'],
    ['/system/menus', 'POST', 'system:menu:create'],
    ['/system/menus/tree', 'GET', 'system:menu:list'],
    ['/system/menus/sort', 'POST', 'system:menu:sort'],
    ['/system/menus/:id', 'PATCH', 'system:menu:update'],
    ['/system/menus/:id', 'DELETE', 'system:menu:delete'],
    ['/system/buttons', 'GET', 'system:button:list'],
    ['/system/buttons', 'POST', 'system:button:create'],
    ['/system/buttons/:id', 'PATCH', 'system:button:update'],
    ['/system/buttons/:id', 'DELETE', 'system:button:delete'],
    ['/system/apis', 'GET', 'system:api:list'],
    ['/system/apis', 'POST', 'system:api:create'],
    ['/system/apis/:id', 'PATCH', 'system:api:update'],
    ['/system/apis/:id', 'DELETE', 'system:api:delete'],
    ['/system/platforms', 'GET', 'system:platform:list'],
    ['/system/platforms', 'POST', 'system:platform:create'],
    ['/system/platforms/:id', 'PATCH', 'system:platform:update'],
    ['/system/platforms/:id', 'DELETE', 'system:platform:delete'],
    ['/system/departments', 'GET', 'system:department:list'],
    ['/system/departments/tree', 'GET', 'system:department:list'],
    ['/system/departments', 'POST', 'system:department:create'],
    ['/system/departments/:id', 'PATCH', 'system:department:update'],
    ['/system/departments/:id', 'DELETE', 'system:department:delete'],
    ['/system/shops', 'GET', 'system:shop:list'],
    ['/system/shops', 'POST', 'system:shop:create'],
    ['/system/shops/:id', 'PATCH', 'system:shop:update'],
    ['/system/shops/:id', 'DELETE', 'system:shop:delete'],
    ['/system/permissions/user-roles', 'POST', 'system:user:assign-role'],
    ['/system/permissions/role-resources', 'POST', 'system:role:assign-permission'],
    ['/attendance/shifts', 'GET', 'attendance:shift:list'],
    ['/attendance/shifts', 'POST', 'attendance:shift:create'],
    ['/attendance/shifts/:id', 'PATCH', 'attendance:shift:update'],
    ['/attendance/shifts/:id', 'DELETE', 'attendance:shift:delete'],
    ['/attendance/schedules', 'GET', 'attendance:schedule:list'],
    ['/attendance/schedules', 'POST', 'attendance:schedule:assign'],
    ['/attendance/schedules/:id', 'DELETE', 'attendance:schedule:assign'],
    ['/attendance/schedules/import', 'POST', 'attendance:schedule:import'],
    ['/attendance/schedules/export', 'GET', 'attendance:schedule:export'],
    ['/attendance/schedules/template', 'GET', 'attendance:schedule:import'],
    ['/attendance/records', 'GET', 'attendance:request:list'],
    ['/attendance/leaves', 'GET', 'attendance:request:list'],
    ['/attendance/overtimes', 'GET', 'attendance:request:list'],
    ['/attendance/patch-cards', 'GET', 'attendance:request:list'],
    ['/attendance/schedule-changes', 'GET', 'attendance:request:list'],
    ['/approval/templates', 'GET', 'approval:process:list'],
    ['/approval/templates/:id', 'GET', 'approval:process:list'],
    ['/approval/templates/:id', 'PATCH', 'approval:process:update'],
    ['/approval/people', 'GET', 'approval:request:list'],
    ['/approval/requests', 'GET', 'approval:request:list'],
    ['/approval/requests/:id/approve', 'POST', 'approval:request:approve'],
    ['/approval/requests/:id/reject', 'POST', 'approval:request:reject'],
    ['/approval/requests/:id/transfer', 'POST', 'approval:request:transfer'],
    ['/system/messages', 'GET', 'system:message:list'],
    ['/system/messages/:id/read', 'PATCH', 'system:message:read'],
    ['/system/messages/read-all', 'PATCH', 'system:message:read']
  ] as const;

  for (const [apiPath, requestMethod, apiName] of apiDefs) {
    await upsertApiPermission(apiPath, requestMethod, apiName, adminRole.id);
  }

  const adminPassword = await hashPassword('Admin123456');
  const adminUser = await prisma.sys_user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPassword,
      name: '系统管理员',
      status: 1,
      is_deleted: 0
    },
    create: {
      username: 'admin',
      password: adminPassword,
      name: '系统管理员',
      status: 1
    }
  });

  await prisma.sys_user_role.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRole.id
      }
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id
    }
  });

  for (const menu of menus) {
    await prisma.sys_role_menu.upsert({
      where: {
        role_id_menu_id: {
          role_id: adminRole.id,
          menu_id: menu.id
        }
      },
      update: {},
      create: {
        role_id: adminRole.id,
        menu_id: menu.id
      }
    });
  }

  for (const button of buttons) {
    await prisma.sys_role_button.upsert({
      where: {
        role_id_button_id: {
          role_id: adminRole.id,
          button_id: button.id
        }
      },
      update: {},
      create: {
        role_id: adminRole.id,
        button_id: button.id
      }
    });
  }
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
