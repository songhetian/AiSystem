import { Navigate, Outlet, useLocation } from 'umi';
import { usePermission } from '@/hooks/usePermission';
import { Result, Button } from 'antd';
import { useNavigate } from 'umi';

/**
 * 路由权限守卫（V2.0 新增）
 * 功能：
 * 1. 检查用户是否有访问当前路由的权限
 * 2. 无权限时跳转到403页面
 * 3. 未登录时跳转到登录页
 * 
 * 使用方式：
 * 在路由配置中添加 wrappers: ['@/components/common/AuthWrapper']
 */
export function AuthWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRoute, currentUser } = usePermission();

  // 未登录，跳转到登录页
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 检查路由权限
  const currentRoute = location.pathname;
  
  // 公共路由（不需要权限检查）
  const publicRoutes = [
    '/login',
    '/403',
    '/404',
    '/maintenance',
    '/account',
  ];
  
  const isPublicRoute = publicRoutes.some(route => currentRoute.startsWith(route));
  
  if (isPublicRoute) {
    return <Outlet />;
  }

  // 检查是否有权限访问该路由
  if (!hasRoute(currentRoute)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}

export default AuthWrapper;
