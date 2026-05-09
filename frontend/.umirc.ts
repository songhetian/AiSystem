import { defineConfig } from '@umijs/max';
import { resolve } from 'path';

export default defineConfig({
  npmClient: 'npm',
  headScripts: [{ src: '/config.js' }],

  // 禁用MFSU，提升Docker中的编译速度
  mfsu: false,

  // 启用Tailwind CSS（使用Umi内置支持）
  tailwindcss: {},

  // 修复 esbuild helpers 冲突问题
  esbuildMinifyIIFE: true,

  routes: [
    { path: '/test', component: 'test' },
    { path: '/login', component: 'login/index' },
    { path: '/register', component: 'register/index' },
    { path: '/debug', component: 'debug' },
    { path: '/maintenance', component: 'maintenance' },
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        { path: '/', component: 'index' },

        // 系统管理
        { path: '/system/users', component: 'system/users/index' },
        { path: '/system/roles', component: 'system/roles/index' },
        { path: '/system/menus', component: 'system/menus/index' },
        { path: '/system/apis', component: 'system/apis/index' },
        { path: '/system/buttons', component: 'system/buttons/index' },
        { path: '/system/departments', component: 'system/departments/index' },
        { path: '/system/platforms', component: 'system/platforms/index' },
        { path: '/system/shops', component: 'system/shops/index' },
        { path: '/system/files', component: 'system/files/index' },
        { path: '/system/ai-config', component: 'system/ai-config/index' },
        { path: '/system/messages', component: 'system/messages/index' },
        { path: '/system/message-templates', component: 'system/message-templates/index' },
        { path: '/system/api-keys', component: 'system/api-keys/index' },
        { path: '/system/integrations', component: 'system/integrations/index' },
        { path: '/system/data-mapping', component: 'system/data-mapping/index' },
        { path: '/system/permission-control', component: 'system/permission-control/index' },
        { path: '/system/permission-template', component: 'system/permission-template/index' },
        { path: '/system/register', component: 'system/register/index' },
        { path: '/system/big-screen', component: 'system/big-screen/index' },

        // 系统日志
        { path: '/system/logs', component: 'system/logs/index' },
        { path: '/system/logs/operation', component: 'system/logs/operation/index' },
        { path: '/system/logs/login', component: 'system/logs/login/index' },
        { path: '/system/operation-logs', component: 'system/operation-logs/index' },

        // 审批系统
        { path: '/approval/process', component: 'approval/process/index' },
        { path: '/approval/requests', component: 'approval/requests/index' },

        // 财务管理
        { path: '/finance/dashboard', component: 'finance/dashboard/index' },
        { path: '/finance/reimbursements', component: 'finance/reimbursements/index' },
        { path: '/finance/reimbursements/stats', component: 'finance/reimbursements/stats' },
        { path: '/finance/purchases', component: 'finance/purchases/index' },
        { path: '/finance/purchases/stats', component: 'finance/purchases/stats' },
        { path: '/finance/cash-records/stats', component: 'finance/cash-records/stats' },

        // 人事管理
        { path: '/org/departments', component: 'personnel/departments/index' },
        { path: '/org/employees', component: 'personnel/employees/index' },
        { path: '/org/edu-dicts', component: 'personnel/education/index' },
        { path: '/personnel/departments', component: 'personnel/departments/index' },
        { path: '/personnel/employees', component: 'personnel/employees/index' },
        { path: '/personnel/positions', component: 'personnel/positions/index' },
        { path: '/personnel/education', component: 'personnel/education/index' },

        // 考勤管理
        { path: '/attendance/records', component: 'attendance/records/index' },
        { path: '/attendance/schedules', component: 'attendance/schedules/index' },
        { path: '/attendance/shifts', component: 'attendance/shifts/index' },
        { path: '/attendance/requests', component: 'attendance/requests/index' },
        { path: '/attendance/statistics', component: 'attendance/statistics/index' },
        { path: '/attendance/my-schedule', component: 'attendance/my-schedule/index' },
        { path: '/attendance/ai-schedule', component: 'attendance/ai-schedule/index' },

        // 知识库管理
        { path: '/knowledge/chat', component: 'knowledge/chat/index' },
        { path: '/knowledge/categories', component: 'knowledge/categories/index' },
        { path: '/knowledge/articles', component: 'knowledge/articles/index' },
        { path: '/knowledge/documents', component: 'knowledge/documents/index' },
        { path: '/knowledge/tags', component: 'knowledge/tags/index' },
        { path: '/knowledge/faq-candidates', component: 'knowledge/faq-candidates/index' },

        // 考试管理
        { path: '/exam/papers', component: 'exam/papers/index' },
        { path: '/exam/plans', component: 'exam/plans/index' },
        { path: '/exam/my', component: 'exam/my/index' },
        { path: '/exam/results', component: 'exam/results/index' },

        // 客服质检
        { path: '/service/sessions', component: 'service/sessions/index' },
        { path: '/service/dashboard', component: 'service/dashboard/index' },
        { path: '/service/quality-rules', component: 'service/quality-rules/index' },
        { path: '/service/sensitive-terms', component: 'service/sensitive-terms/index' },
        { path: '/service/loss-analysis', component: 'service/loss-analysis/index' },
        { path: '/service/faq-stats', component: 'service/faq-stats/index' },
        { path: '/service/tags', component: 'service/tags/index' },
        { path: '/service/agent-groups', component: 'service/agent-groups/index' },
        { path: '/service/quality-prompts', component: 'service/quality-prompts/index' },

        // 商城管理
        { path: '/shop/products', component: 'shop/products/index' },
        { path: '/shop/activities', component: 'shop/activities/index' },

        // 账户设置
        { path: '/account/settings', component: 'account/settings/index' },

        // 示例页面
        { path: '/examples/performance-demo', component: 'examples/performance-demo' },

        // 错误页面
        { path: '/403', component: '403' },
        { path: '/*', component: '404' }
      ]
    }
  ],

  alias: {
    '@': resolve(__dirname, 'src')
  }
});
