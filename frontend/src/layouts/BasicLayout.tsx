import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'umi';
import { Badge, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { approvalApi, type ApprovalRequestStats } from '@/api/approval';
import { authApi } from '@/api/auth';
import { HeaderMessageHub } from '@/components/common/HeaderMessageHub';
import { RealtimeNotificationCenter, type RealtimeMessageEvent } from '@/components/common/RealtimeNotificationCenter';
import { systemApi, type MessageStats } from '@/api/system';
import { useGlobalStore } from '@/models/global';

const { Header, Sider, Content } = Layout;

const fallbackItems: Array<{ key: string; label: string }> = [
  { key: '/system/users', label: '用户管理' },
  { key: '/system/messages', label: '站内消息' },
  { key: '/system/roles', label: '角色管理' },
  { key: '/system/logs', label: '日志管理' },
  { key: '/org/departments', label: '组织架构' },
  { key: '/org/positions', label: '岗位管理' },
  { key: '/org/employees', label: '员工管理' },
  { key: '/attendance/schedules', label: '排班管理' },
  { key: '/attendance/requests', label: '考勤申请' },
  { key: '/approval/process', label: '审批流程' },
  { key: '/approval/requests', label: '审批中心' },
  { key: '/service/sessions', label: 'AI质检' },
  { key: '/service/quality-rules', label: '质检规则' },
  { key: '/service/sensitive-terms', label: '敏感词管理' },
  { key: '/knowledge/faq-candidates', label: 'FAQ候选池' },
  { key: '/knowledge/articles', label: '知识库文章' }
];

export default function BasicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, currentUser, setCurrentUser, setToken } = useGlobalStore();
  const [lastMessageEvent, setLastMessageEvent] = useState<RealtimeMessageEvent>();

  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    enabled: Boolean(token)
  });

  const { data: messageStats } = useQuery<MessageStats>({
    queryKey: ['system-message-stats'],
    queryFn: systemApi.messageStats,
    enabled: Boolean(token)
  });

  const { data: approvalStats } = useQuery<ApprovalRequestStats>({
    queryKey: ['approval-request-stats'],
    queryFn: approvalApi.requestStats,
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

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io('/ws', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket']
    });

    const invalidateRealtimeQueries = () => {
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['system-messages'] });
        void queryClient.invalidateQueries({ queryKey: ['system-message-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
        void queryClient.invalidateQueries({ queryKey: ['approval-request-stats'] });
      }, 250);
    };

    const handleSystemMessageChanged = (event: RealtimeMessageEvent) => {
      setLastMessageEvent({
        ...event,
        emittedAt: event.emittedAt ?? new Date().toISOString()
      });
      invalidateRealtimeQueries();
    };

    socket.on('system-message.changed', handleSystemMessageChanged);
    socket.on('approval-request.changed', invalidateRealtimeQueries);

    return () => {
      socket.off('system-message.changed', handleSystemMessageChanged);
      socket.off('approval-request.changed', invalidateRealtimeQueries);
      socket.close();
    };
  }, [queryClient, token]);

  const badgeMap = useMemo(
    () => ({
      '/system/messages': messageStats?.unreadCount ?? 0,
      '/approval/requests': approvalStats?.pendingCount ?? 0
    }),
    [approvalStats?.pendingCount, messageStats?.unreadCount]
  );

  const renderMenuLabel = (path: string, label: string) => (
    <Badge count={badgeMap[path as keyof typeof badgeMap] ?? 0} size="small" offset={[10, 0]}>
      <Link to={path}>{label}</Link>
    </Badge>
  );

  const userItems =
    currentUser?.menus
      ?.filter((menu) => menu.route)
      .map((menu) => ({
        key: menu.route!,
        label: menu.menu_name
      })) ?? [];

  const sourceItems =
    userItems.length > 0
      ? userItems.some((item) => item.key === '/system/messages')
        ? userItems
        : [...userItems, { key: '/system/messages', label: '站内消息' }]
      : fallbackItems;

  const items: MenuProps['items'] = sourceItems.map((item) => ({
    key: item.key,
    label: renderMenuLabel(item.key, item.label)
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <RealtimeNotificationCenter lastEvent={lastMessageEvent} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Text strong>企业控制台</Typography.Text>
              <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                审批、消息和 AI 质检统一接入头部消息通道
              </Typography.Text>
            </div>
            <Space size={16}>
              <HeaderMessageHub enabled={Boolean(token)} />
              <Typography.Text>{currentUser?.name ?? currentUser?.username ?? 'Current User'}</Typography.Text>
              <Typography.Link
                onClick={() => {
                  setToken(undefined);
                  setCurrentUser(undefined);
                  navigate('/login');
                }}
              >
                退出登录
              </Typography.Link>
            </Space>
          </div>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
