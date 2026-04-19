import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedQualityPromptMenus() {
  console.log('开始添加质检Prompt管理菜单...');

  try {
    // 1. 查找"客服管理"父菜单
    const serviceMenu = await prisma.sys_menu.findFirst({
      where: { menu_code: 'service' },
    });

    if (!serviceMenu) {
      console.error('未找到"客服管理"父菜单,请先创建service菜单');
      return;
    }

    console.log(`找到父菜单: ${serviceMenu.menu_name} (ID: ${serviceMenu.id})`);

    // 2. 添加"智能Prompt管理"父菜单
    const promptParentMenu = await prisma.sys_menu.upsert({
      where: { menu_code: 'service:quality-prompts' },
      update: {},
      create: {
        id: 'quality_prompt_parent',
        menu_name: '智能Prompt管理',
        menu_code: 'service:quality-prompts',
        parent_id: serviceMenu.id,
        icon: 'FileTextOutlined',
        route: null,
        sort: 40,
        type: 1,
        status: 1,
        is_deleted: 0,
      },
    });

    console.log(`✓ 创建父菜单: ${promptParentMenu.menu_name}`);

    // 3. 添加子菜单
    const subMenus = [
      {
        id: 'quality_prompt_global',
        menu_name: '全局Prompt管理',
        menu_code: 'service:quality-prompts:global',
        icon: 'GlobalOutlined',
        route: '/service/quality-prompts/global',
        sort: 1,
      },
      {
        id: 'quality_prompt_department',
        menu_name: '部门Prompt管理',
        menu_code: 'service:quality-prompts:department',
        icon: 'TeamOutlined',
        route: '/service/quality-prompts/department',
        sort: 2,
      },
      {
        id: 'quality_prompt_templates',
        menu_name: 'Prompt模板库',
        menu_code: 'service:quality-prompts:templates',
        icon: 'AppstoreOutlined',
        route: '/service/quality-prompts/templates',
        sort: 3,
      },
      {
        id: 'quality_prompt_audit_logs',
        menu_name: 'Prompt审计日志',
        menu_code: 'service:quality-prompts:audit-logs',
        icon: 'AuditOutlined',
        route: '/service/quality-prompts/audit-logs',
        sort: 4,
      },
    ];

    for (const menu of subMenus) {
      const createdMenu = await prisma.sys_menu.upsert({
        where: { menu_code: menu.menu_code },
        update: {},
        create: {
          id: menu.id,
          menu_name: menu.menu_name,
          menu_code: menu.menu_code,
          parent_id: promptParentMenu.id,
          icon: menu.icon,
          route: menu.route,
          sort: menu.sort,
          type: 2,
          status: 1,
          is_deleted: 0,
        },
      });

      console.log(`✓ 创建子菜单: ${createdMenu.menu_name}`);
    }

    // 4. 为Super Admin角色分配权限
    const superAdminRole = await prisma.sys_role.findFirst({
      where: { role_code: 'super_admin' },
    });

    if (superAdminRole) {
      const allMenus = await prisma.sys_menu.findMany({
        where: {
          menu_code: {
            startsWith: 'service:quality-prompts',
          },
        },
      });

      for (const menu of allMenus) {
        await prisma.sys_role_menu.upsert({
          where: {
            role_id_menu_id: {
              role_id: superAdminRole.id,
              menu_id: menu.id,
            },
          },
          update: {},
          create: {
            id: `role_menu_${menu.menu_code}`,
            role_id: superAdminRole.id,
            menu_id: menu.id,
          },
        });
      }

      console.log(`✓ 为Super Admin角色分配了 ${allMenus.length} 个菜单权限`);
    } else {
      console.warn('⚠ 未找到Super Admin角色,跳过权限分配');
    }

    // 5. 为Department Manager角色分配部分权限
    const deptManagerRole = await prisma.sys_role.findFirst({
      where: { role_code: 'dept_manager' },
    });

    if (deptManagerRole) {
      const deptMenus = await prisma.sys_menu.findMany({
        where: {
          menu_code: {
            in: [
              'service:quality-prompts',
              'service:quality-prompts:department',
              'service:quality-prompts:templates',
              'service:quality-prompts:audit-logs',
            ],
          },
        },
      });

      for (const menu of deptMenus) {
        await prisma.sys_role_menu.upsert({
          where: {
            role_id_menu_id: {
              role_id: deptManagerRole.id,
              menu_id: menu.id,
            },
          },
          update: {},
          create: {
            id: `role_menu_dept_${menu.menu_code}`,
            role_id: deptManagerRole.id,
            menu_id: menu.id,
          },
        });
      }

      console.log(`✓ 为Department Manager角色分配了 ${deptMenus.length} 个菜单权限`);
    } else {
      console.warn('⚠ 未找到Department Manager角色,跳过权限分配');
    }

    // 6. 验证结果
    const createdMenus = await prisma.sys_menu.findMany({
      where: {
        menu_code: {
          startsWith: 'service:quality-prompts',
        },
      },
      orderBy: { sort: 'asc' },
    });

    console.log('\n=== 创建的菜单列表 ===');
    for (const menu of createdMenus) {
      console.log(`- ${menu.menu_name} (${menu.menu_code}) - Route: ${menu.route || 'N/A'}`);
    }

    console.log('\n✅ 质检Prompt管理菜单添加完成!');
  } catch (error) {
    console.error('❌ 添加菜单时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行seed
seedQualityPromptMenus()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
