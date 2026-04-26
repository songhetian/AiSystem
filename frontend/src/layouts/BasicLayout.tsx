import { useEffect, useState, useMemo } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "@umijs/max";
import { ProLayout, PageContainer } from "@ant-design/pro-components";
import {
  Space,
  Typography,
  Dropdown,
  Badge,
  ConfigProvider,
  Modal,
  Button,
  theme,
  Input,
} from "antd";
import {
  LogoutOutlined,
  BellOutlined,
  RobotOutlined,
  DashboardOutlined,
  ShopOutlined,
  ControlOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  BulbFilled,
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { systemApi } from "@/api/system";
import { approvalApi } from "@/api/approval";
import { examApi, type ExamAssignment } from "@/api/exam";
import { HeaderMessageHub } from "@/components/common/HeaderMessageHub";
import {
  RealtimeNotificationCenter,
  type RealtimeMessageEvent,
} from "@/components/common/RealtimeNotificationCenter";
import { useGlobalStore } from "@/models/global";
import { useTheme } from "@/hooks/useTheme";
import zhCN from "antd/locale/zh_CN";
import FloatingChat from "@/components/common/FloatingChat";
import { MenuSearch } from "@/components/common/MenuSearch";

const { Text, Title } = Typography;
const { useToken } = theme;

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, currentUser, setCurrentUser, setToken } = useGlobalStore();
  const { isDark, toggleTheme, algorithm } = useTheme();
  const { token: antdToken } = useToken();
  
  const [lastMessageEvent, setLastMessageEvent] = useState<RealtimeMessageEvent>();
  const [activeExamModalOpen, setActiveExamModalOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // 1. 数据查询
  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    enabled: Boolean(token),
  });

  const { data: messageStats } = useQuery({
    queryKey: ["system-message-stats"],
    queryFn: systemApi.messageStats,
    enabled: Boolean(token),
  });

  const { data: approvalStats } = useQuery({
    queryKey: ["approval-request-stats"],
    queryFn: approvalApi.requestStats,
    enabled: Boolean(token),
  });

  const { data: activeExam } = useQuery<ExamAssignment | null>({
    queryKey: ["exam-active"],
    queryFn: examApi.getMyActiveExam,
    enabled: Boolean(token),
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (!token) navigate("/login");
    if (me) setCurrentUser(me);
  }, [me, token, setCurrentUser, navigate]);

  useEffect(() => {
    if (!activeExam) {
      setActiveExamModalOpen(false);
      return;
    }
    const storageKey = `exam-active-notice:${activeExam.id}`;
    if (activeExam.reminder_mode === "force") {
      setActiveExamModalOpen(true);
      return;
    }
    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, "1");
      setActiveExamModalOpen(true);
    }
  }, [activeExam]);

  // 快捷键监听 (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. 菜单树构建逻辑 (支持一级二级)
  const menuIconMap: Record<string, React.ReactNode> = {
    "/system": <AppstoreOutlined />,
    "/org": <TeamOutlined />,
    "/approval": <SafetyCertificateOutlined />,
    "/service": <RobotOutlined />,
    "/exam": <SafetyCertificateOutlined />,
    "/finance": <DashboardOutlined />,
    "/shop": <ShopOutlined />,
  };

  const menuTree = useMemo(() => {
    if (!currentUser?.menus) return [];
    
    // 基础固定菜单
    const baseMenus = [
      {
        path: "/finance/dashboard",
        name: "工作台大屏",
        icon: <DashboardOutlined />,
      }
    ];

    const list = currentUser.menus.filter(m => m.route);
    const tree: any[] = [...baseMenus];
    const map = new Map();

    // 先把所有菜单放进 Map
    list.forEach(m => {
      map.set(m.id, {
        path: m.route,
        name: m.menu_name,
        id: m.id,
        parentId: m.parent_id,
        icon: menuIconMap[m.route!.split("/").slice(0, 2).join("/")] || <AppstoreOutlined />,
        children: []
      });
    });

    // 构建树
    map.forEach(node => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }, [currentUser]);

  if (!token) return <Navigate to="/login" replace />;

  if (!currentUser && token) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: isDark ? '#141414' : '#f8fafc' }}>
        <Space direction="vertical" align="center">
          <RobotOutlined style={{ fontSize: 48, color: antdToken.colorPrimary }} />
          <Text strong style={{ fontWeight: 400 }}>系统正在加载...</Text>
        </Space>
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: algorithm,
        token: {
          borderRadius: 8,
          fontFamily: "'Inter', 'PingFang SC', sans-serif",
        },
      }}
    >
      <div id="pro-layout-container" style={{ height: "100vh" }}>
        <RealtimeNotificationCenter lastEvent={lastMessageEvent} />
        
        <MenuSearch 
          menuData={menuTree} 
          visible={searchVisible} 
          onCancel={() => setSearchVisible(false)} 
        />

        <Modal
          open={activeExamModalOpen}
          closable={activeExam?.reminder_mode !== "force"}
          maskClosable={activeExam?.reminder_mode !== "force"}
          title="系统任务通知"
          onCancel={() => setActiveExamModalOpen(false)}
          onOk={() => {
            if (activeExam) {
              setActiveExamModalOpen(false);
              navigate(`/exam/my/${activeExam.id}`);
            }
          }}
        >
          <Text strong style={{ fontSize: 16 }}>{activeExam?.plan.plan_name}</Text>
          <p style={{ marginTop: 12, color: antdToken.colorTextSecondary }}>
            {activeExam?.reminder_mode === "force" 
              ? "这是一项强制任务，请立即处理。" 
              : "您有一项新的任务需要跟进。"}
          </p>
        </Modal>

        <ProLayout
          title="雷犀AI客服管理系统"
          logo={null}
          layout="mix"
          fixedHeader
          fixSiderbar
          location={location}
          menuDataRender={() => menuTree}
          menuItemRender={(item, dom) => (
            <Link to={item.path || "/"} style={{ color: 'inherit', fontWeight: 400 }}>
              {dom}
            </Link>
          )}
          subMenuItemRender={(item, dom) => (
            <span style={{ fontWeight: 500 }}>{dom}</span>
          )}
          // 头部内容自定义
          headerContentRender={() => (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                width: '280px',
                marginLeft: '24px'
              }}
              onClick={() => setSearchVisible(true)}
            >
              <SearchOutlined style={{ color: antdToken.colorTextSecondary, marginRight: 8 }} />
              <Text type="secondary" style={{ fontSize: '13px' }}>快速搜索功能... (Ctrl + K)</Text>
            </div>
          )}
          // 头部右侧工具栏
          actionsRender={() => [
            <HeaderMessageHub key="message-hub" enabled={Boolean(token)} />,
            <Tooltip key="theme" title="外观切换">
              <Button 
                type="text" 
                icon={isDark ? <BulbFilled style={{ color: '#fbbf24' }} /> : <BulbOutlined />} 
                onClick={toggleTheme}
                style={{ fontSize: '18px' }}
              />
            </Tooltip>,
          ]}
          avatarProps={{
            src: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser?.username,
            title: (
              <Text style={{ fontWeight: 500, marginLeft: 8 }}>
                {currentUser?.name || "管理员"}
              </Text>
            ),
            size: "small",
            render: (_props, dom) => (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "profile",
                      icon: <UserOutlined />,
                      label: "个人设置",
                    },
                    { type: 'divider' },
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: "退出登录",
                      danger: true,
                      onClick: () => {
                        setToken(undefined);
                        setCurrentUser(undefined);
                        navigate("/login");
                      },
                    },
                  ],
                }}
              >
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {dom}
                </div>
              </Dropdown>
            ),
          }}
          siderWidth={220}
          token={{
            sider: {
              colorMenuBackground: isDark ? "#141414" : "#ffffff",
              colorTextMenu: antdToken.colorText,
              colorTextMenuSelected: antdToken.colorPrimary,
              colorBgMenuItemSelected: isDark ? "rgba(255,255,255,0.05)" : "#e6f7ff",
            },
            header: {
              colorBgHeader: isDark ? "#141414" : "#ffffff",
              colorHeaderTitle: antdToken.colorText,
            },
          }}
        >
          <PageContainer
            header={{
              title: null,
              breadcrumb: {},
            }}
            style={{ padding: '16px' }}
          >
            <Outlet />
          </PageContainer>
        </ProLayout>
        <FloatingChat />
      </div>
      
      <style>{`
        /* 全局字体磅值微调，去除厚重感 */
        body {
          font-weight: 400;
          -webkit-font-smoothing: antialiased;
        }
        .ant-menu-title-content {
          font-weight: 400 !important;
        }
        .ant-layout-sider {
          border-right: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} !important;
        }
        .ant-pro-layout-header {
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
