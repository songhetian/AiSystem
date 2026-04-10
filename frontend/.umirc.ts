import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  esbuildMinifyIIFE: true,
  routes: [
    { path: '/login', component: '@/pages/login' },
    { path: '/maintenance', component: '@/pages/maintenance' },
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        { path: '/', redirect: '/system/users' },
        { path: '/system/users', component: '@/pages/system/users' },
        { path: '/system/roles', component: '@/pages/system/roles' },
        { path: '/system/menus', component: '@/pages/system/menus' },
        { path: '/system/buttons', component: '@/pages/system/buttons' },
        { path: '/system/apis', component: '@/pages/system/apis' },
        { path: '/system/platforms', component: '@/pages/system/platforms' },
        { path: '/system/departments', component: '@/pages/system/departments' },
        { path: '/system/shops', component: '@/pages/system/shops' },
        { path: '/system/logs', component: '@/pages/system/logs' },
        { path: '/org/departments', component: '@/pages/personnel/departments' },
        { path: '/org/positions', component: '@/pages/personnel/positions' },
        { path: '/org/employees', component: '@/pages/personnel/employees' },
        { path: '/attendance/schedules', component: '@/pages/attendance/schedules' },
        { path: '/attendance/shifts', component: '@/pages/attendance/shifts' },
        { path: '/attendance/records', component: '@/pages/attendance/records' },
        { path: '/attendance/statistics', component: '@/pages/attendance/statistics' },
        { path: '/attendance/requests', component: '@/pages/attendance/requests' },
        { path: '/approval/process', component: '@/pages/approval/process' },
        { path: '/approval/requests', component: '@/pages/approval/requests' },
        { path: '/system/messages', component: '@/pages/system/messages' },
        { path: '/service/sessions', component: '@/pages/service/sessions' },
        { path: '/service/sessions/:id', component: '@/pages/service/sessions/[id]' },
        { path: '/service/quality-rules', component: '@/pages/service/quality-rules' },
        { path: '/service/sensitive-terms', component: '@/pages/service/sensitive-terms' },
        { path: '/exam/papers', component: '@/pages/exam/papers' },
        { path: '/exam/plans', component: '@/pages/exam/plans' },
        { path: '/exam/my', component: '@/pages/exam/my' },
        { path: '/exam/my/:id', component: '@/pages/exam/my/[id]' },
        { path: '/exam/results', component: '@/pages/exam/results' },
        { path: '/knowledge/faq-candidates', component: '@/pages/knowledge/faq-candidates' },
        { path: '/knowledge/articles', component: '@/pages/knowledge/articles' },
        { path: '/knowledge/articles/:id', component: '@/pages/knowledge/articles/[id]' },
        { path: '/knowledge/categories', component: '@/pages/knowledge/categories' },
        { path: '/knowledge/tags', component: '@/pages/knowledge/tags' },
        { path: '/403', component: '@/pages/403' },
        { path: '/*', component: '@/pages/404' }
      ]
    }
  ],
  alias: {
    '@': '/src'
  }
});
