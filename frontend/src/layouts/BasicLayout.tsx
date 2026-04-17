import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ProLayout, PageContainer } from "@ant-design/pro-components";
import {
  Space,
  Typography,
  Dropdown,
  Badge,
  ConfigProvider,
  Modal,
  Switch,
  Tooltip,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
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
import zhCN from "antd/lib/locale/zh_CN";
import FloatingChat from "@/components/common/FloatingChat";

const { Text } = Typography;

export default function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, currentUser, setCurrentUser, setToken } = useGlobalStore();
  const { isDark, toggleTheme, algorithm } = useTheme();
  const [lastMessageEvent, setLastMessageEvent] =
    useState<RealtimeMessageEvent>();
  const [activeExamModalOpen, setActiveExamModalOpen] = useState(false);

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

  // 2. 菜单图标映射
  const menuIconMap: Record<string, React.ReactNode> = {
    "/system": <AppstoreOutlined />,
    "/org": <TeamOutlined />,
    "/approval": <SafetyCertificateOutlined />,
    "/service": <RobotOutlined />,
    "/exam": <SafetyCertificateOutlined />,
    "/finance": <DashboardOutlined />,
    "/shop": <ShopOutlined />,
    "/system/data-mapping": <ControlOutlined />,
    "/attendance/ai-schedule": <ThunderboltOutlined />,
  };

  // 3. 处理菜单数据 (严格适配 ProLayout)
  const menuData =
    currentUser?.menus
      ?.filter((m) => m.route)
      .map((m) => ({
        path: m.route,
        name: m.menu_name,
        icon: menuIconMap[m.route!.split("/").slice(0, 2).join("/")] || (
          <AppstoreOutlined />
        ),
      })) || [];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: algorithm,
      }}
    >
      <div id="pro-layout-container" style={{ height: "100vh" }}>
        <RealtimeNotificationCenter lastEvent={lastMessageEvent} />
        <Modal
          open={activeExamModalOpen}
          closable={activeExam?.reminder_mode !== "force"}
          maskClosable={activeExam?.reminder_mode !== "force"}
          cancelButtonProps={{
            style: {
              display:
                activeExam?.reminder_mode === "force" ? "none" : undefined,
            },
          }}
          title={
            activeExam?.reminder_mode === "force" ? "强制考试提醒" : "考试提醒"
          }
          onCancel={() => setActiveExamModalOpen(false)}
          onOk={() => {
            if (activeExam) {
              setActiveExamModalOpen(false);
              navigate(`/exam/my/${activeExam.id}`);
            }
          }}
        >
          <p>{activeExam?.plan.plan_name}</p>
          <p>{activeExam?.plan.paper?.paper_name}</p>
          <p>
            {activeExam?.reminder_mode === "force"
              ? "当前考试已开始，请立即进入考试页面。"
              : "当前有一场考试正在进行，请按时完成。"}
          </p>
        </Modal>
        <ProLayout
          title="雷犀系统 AiSystem"
          logo="/logo.png" // 假设有Logo
          layout="mix" // 混合布局，AD Pro 5 推荐
          fixedHeader
          fixSiderbar
          location={location}
          menuDataRender={() => [
            {
              path: "/finance/dashboard",
              name: "财务大屏",
              icon: <DashboardOutlined />,
            },
            ...menuData,
          ]}
          menuItemRender={(item, dom) => (
            <Link to={item.path || "/"} className="font-bold text-slate-700">
              {dom}
            </Link>
          )}
          subMenuItemRender={(_, dom) => (
            <span className="font-black text-slate-900">{dom}</span>
          )}
          // 头部右侧工具栏
          actionsRender={() => [
            <Tooltip
              key="theme-toggle"
              title={isDark ? "切换到浅色模式" : "切换到深色模式"}
            >
              <Switch
                checked={isDark}
                onChange={toggleTheme}
                checkedChildren={<BulbFilled />}
                unCheckedChildren={<BulbOutlined />}
                style={{ marginRight: 16 }}
              />
            </Tooltip>,
            <HeaderMessageHub key="message-hub" enabled={Boolean(token)} />,
            <Badge
              key="pending-approval"
              count={approvalStats?.pendingCount}
              size="small"
            >
              <BellOutlined className="text-slate-600 text-lg cursor-pointer" />
            </Badge>,
          ]}
          avatarProps={{
            src: "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png",
            title: (
              <Text className="font-black text-slate-900">
                {currentUser?.name || "管理员"}
              </Text>
            ),
            size: "small",
            render: (_props, dom) => (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: "退出登录",
                      onClick: () => {
                        setToken(undefined);
                        setCurrentUser(undefined);
                        navigate("/login");
                      },
                    },
                  ],
                }}
              >
                {dom}
              </Dropdown>
            ),
          }}
          siderWidth={240}
          token={{
            sider: {
              colorMenuBackground: "#ffffff",
              colorTextMenuSelected: "#0f172a", // slate-900
              colorBgMenuItemSelected: "#f1f5f9", // slate-100
            },
            header: {
              colorBgHeader: "#ffffff",
              colorHeaderTitle: "#0f172a",
            },
          }}
        >
          <PageContainer
            header={{
              title: null, // 隐藏默认标题，使用页面内自定义
              breadcrumb: {}, // 开启面包屑
            }}
            style={{ padding: 0 }}
          >
            <Outlet />
          </PageContainer>
        </ProLayout>
        <FloatingChat />
      </div>
    </ConfigProvider>
  );
}
