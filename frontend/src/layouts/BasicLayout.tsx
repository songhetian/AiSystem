import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'umi';
import { Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useGlobalStore } from '@/models/global';

const { Header, Sider, Content } = Layout;

const fallbackItems: MenuProps['items'] = [
  { key: '/system/users', label: <Link to="/system/users">用户管理</Link> },
  { key: '/system/messages', label: <Link to="/system/messages">站内消息</Link> },
  { key: '/system/roles', label: <Link to="/system/roles">角色管理</Link> },
  { key: '/system/logs', label: <Link to="/system/logs">日志管理</Link> },
  { key: '/org/departments', label: <Link to="/org/departments">组织架构</Link> },
  { key: '/org/positions', label: <Link to="/org/positions">岗位管理</Link> },
  { key: '/org/employees', label: <Link to="/org/employees">员工管理</Link> },
  { key: '/attendance/schedules', label: <Link to="/attendance/schedules">排班管理</Link> },
  { key: '/attendance/requests', label: <Link to="/attendance/requests">考勤申请</Link> },
  { key: '/approval/process', label: <Link to="/approval/process">审批流程</Link> },
  { key: '/approval/requests', label: <Link to="/approval/requests">审批中心</Link> }
];

export default function BasicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, currentUser, setCurrentUser, setToken } = useGlobalStore();
  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [navigate, token]);

  useEffect(() => {
    if (data) {
      setCurrentUser(data);
    }
  }, [data, setCurrentUser]);

  const itemsFromUser =
    currentUser?.menus
      ?.filter((menu) => menu.route)
      .map((menu) => ({
        key: menu.route!,
        label: <Link to={menu.route!}>{menu.menu_name}</Link>
      })) ?? [];

  const items: MenuProps['items'] =
    itemsFromUser.length > 0
      ? itemsFromUser.some((item) => item?.key === '/system/messages')
        ? itemsFromUser
        : [...itemsFromUser, { key: '/system/messages', label: <Link to="/system/messages">站内消息</Link> }]
      : fallbackItems;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="light">
        <div style={{ padding: 20 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            AiSystem
          </Typography.Title>
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text strong>Enterprise Console</Typography.Text>
            <Typography.Link
              onClick={() => {
                setToken(undefined);
                setCurrentUser(undefined);
                navigate('/login');
              }}
            >
              Sign out
            </Typography.Link>
          </div>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
