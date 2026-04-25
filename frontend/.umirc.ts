import { defineConfig } from '@umijs/max';
import { resolve } from 'path';

export default defineConfig({
  npmClient: 'npm',
  
  // 禁用MFSU，提升Docker中的编译速度
  mfsu: false,
  
  // 启用Tailwind CSS（使用Umi内置支持）
  tailwindcss: {},
  
  routes: [
    { path: '/test', component: 'test' },
    { path: '/login', component: 'login/index' },
    { path: '/register', component: 'register/index' },
    { path: '/debug', component: 'debug' },
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        { path: '/', component: 'index' },
        { path: '/system/users', component: 'system/users/index' },
        { path: '/system/roles', component: 'system/roles/index' },
        { path: '/system/menus', component: 'system/menus/index' },
        { path: '/system/apis', component: 'system/apis/index' },
        { path: '/system/departments', component: 'system/departments/index' },
        { path: '/system/shops', component: 'system/shops/index' },
        { path: '/system/logs', component: 'system/logs/index' },
        { path: '/system/files', component: 'system/files/index' },
        { path: '/system/ai-config', component: 'system/ai-config/index' },
        { path: '/finance/dashboard', component: 'finance/dashboard/index' },
        { path: '/org/departments', component: 'personnel/departments/index' },
        { path: '/org/employees', component: 'personnel/employees/index' },
        { path: '/attendance/records', component: 'attendance/records/index' },
        { path: '/knowledge/chat', component: 'knowledge/chat/index' },
        { path: '/403', component: '403' },
        { path: '/*', component: '404' }
      ]
    }
  ],

  alias: {
    '@': resolve(__dirname, 'src')
  }
});
