import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  esbuildMinifyIIFE: true,
  
  // V2.0 性能优化配置
  // 1. 代码分割和懒加载
  dynamicImport: {
    loading: '@/components/common/LeixiLoading', // 加载组件
  },
  
  // 2. 构建优化
  mfsu: {
    strategy: 'normal', // 模块联邦加速
  },
  
  // 3. 压缩优化
  jsMinifier: 'esbuild', // 使用esbuild压缩（更快）
  cssMinifier: 'esbuild',
  
  // 4. 代码分割策略
  chunks: ['vendors', 'umi'],
  chainWebpack(config) {
    // 优化代码分割
    config.optimization.splitChunks({
      chunks: 'all',
      cacheGroups: {
        // 第三方库单独打包
        vendors: {
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          reuseExistingChunk: true,
        },
        // Ant Design单独打包
        antd: {
          name: 'antd',
          test: /[\\/]node_modules[\\/](antd|@ant-design)[\\/]/,
          priority: 20,
        },
        // React相关单独打包
        react: {
          name: 'react',
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          priority: 20,
        },
        // 公共组件
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    });
  },
  
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
        { path: '/system/big-screen', component: '@/pages/system/big-screen' },
        { path: '/finance/dashboard', component: '@/pages/finance/dashboard' },
        { path: '/finance/reimbursements', component: '@/pages/finance/reimbursements' },
        { path: '/finance/reimbursements/stats', component: '@/pages/finance/reimbursements/stats' },
        { path: '/finance/purchases', component: '@/pages/finance/purchases' },
        { path: '/finance/purchases/stats', component: '@/pages/finance/purchases/stats' },
        { path: '/finance/cash-records/stats', component: '@/pages/finance/cash-records/stats' },
        { path: '/approval/templates', component: '@/pages/approval/templates' },
        { path: '/org/departments', component: '@/pages/personnel/departments' },
        { path: '/org/positions', component: '@/pages/personnel/positions' },
        { path: '/org/employees', component: '@/pages/personnel/employees' },
        { path: '/attendance/schedules', component: '@/pages/attendance/schedules' },
        { path: '/attendance/ai-schedule', component: '@/pages/attendance/ai-schedule' },
        { path: '/attendance/shifts', component: '@/pages/attendance/shifts' },
        { path: '/attendance/records', component: '@/pages/attendance/records' },
        { path: '/attendance/statistics', component: '@/pages/attendance/statistics' },
        { path: '/attendance/requests', component: '@/pages/attendance/requests' },
        { path: '/system/data-mapping', component: '@/pages/system/data-mapping' },
        { path: '/approval/process', component: '@/pages/approval/process' },
        { path: '/approval/requests', component: '@/pages/approval/requests' },
        { path: '/system/messages', component: '@/pages/system/messages' },
        { path: '/system/message-templates', component: '@/pages/system/message-templates' },
        { path: '/service/sessions', component: '@/pages/service/sessions' },
        { path: '/service/sessions/:id', component: '@/pages/service/sessions/[id]' },
        { path: '/service/quality-rules', component: '@/pages/service/quality-rules' },
        { path: '/service/sensitive-terms', component: '@/pages/service/sensitive-terms' },
        { path: '/exam/papers', component: '@/pages/exam/papers' },
        { path: '/exam/plans', component: '@/pages/exam/plans' },
        { path: '/exam/plans/:id', component: '@/pages/exam/plans/[id]' },
        { path: '/exam/my', component: '@/pages/exam/my' },
        { path: '/exam/my/:id', component: '@/pages/exam/my/[id]' },
        { path: '/exam/results', component: '@/pages/exam/results' },
        { path: '/knowledge/faq-candidates', component: '@/pages/knowledge/faq-candidates' },
        { path: '/knowledge/chat', component: '@/pages/knowledge/chat' },
        { path: '/knowledge/articles', component: '@/pages/knowledge/articles' },
        { path: '/knowledge/articles/:id', component: '@/pages/knowledge/articles/[id]' },
        { path: '/knowledge/documents', component: '@/pages/knowledge/documents' },
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
