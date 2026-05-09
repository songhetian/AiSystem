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
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import FloatingChat from "@/components/common/FloatingChat";
import { MenuSearch } from "@/components/common/MenuSearch";
import { RightContent } from "@/components/RightContent";
import { enterpriseThemeConfig } from "@/components/common/EnterpriseThemeConfig";

const { Text, Title } = Typography;
const { useToken } = theme;

// ─── 静态常量移出组件，避免每次渲染重新创建 ───────────────────────────────
const ROUTE_DICTIONARY: Record<string, { name: string; group: string; subGroup?: string }> = {
  // 工作台
  "/": { name: "工作台概览", group: "工作台" },

  // 基础设置 (对标钉钉)
  "/org/departments": { name: "业务部门", group: "基础设置" },
  "/system/departments": { name: "组织架构管理", group: "基础设置" },
  "/org/positions": { name: "岗位管理", group: "基础设置" },
  "/system/roles": { name: "角色与权限", group: "基础设置" },
  "/org/edu-dicts": { name: "学历字典管理", group: "基础设置" },
  "/personnel/education": { name: "学历管理", group: "员工信息管理" },

  // 员工信息管理
  "/system/users": { name: "系统用户", group: "员工信息管理" },
  "/org/employees": { name: "员工档案", group: "员工信息管理" },
  "/org/staff": { name: "员工配置", group: "员工信息管理" },

  // 员工履历管理
  "/org/resumes": { name: "履历时间轴", group: "员工履历管理" },

  // 员工查询与导出
  "/org/query": { name: "查询与导出", group: "员工查询与导出" },

  // AI设置
  "/system/ai-config": { name: "大模型引擎", group: "AI设置" },
  "/service/quality-prompts/global": { name: "全局Prompt", group: "AI设置", subGroup: "提示词工程" },
  "/service/quality-prompts/department": { name: "部门Prompt", group: "AI设置", subGroup: "提示词工程" },
  "/service/quality-prompts/templates": { name: "Prompt模板", group: "AI设置", subGroup: "提示词工程" },
  "/service/quality-prompts/audit-logs": { name: "Prompt日志", group: "AI设置", subGroup: "提示词工程" },

  // 智能客服系统
  "/service/dashboard": { name: "服务大屏", group: "智能客服系统" },
  "/service/sessions": { name: "会话质检", group: "智能客服系统", subGroup: "质检体系" },
  "/service/quality-rules": { name: "质检规则", group: "智能客服系统", subGroup: "质检体系" },
  "/service/tags": { name: "质检标签", group: "智能客服系统", subGroup: "质检体系" },
  "/service/sensitive-terms": { name: "敏感词库", group: "智能客服系统", subGroup: "质检体系" },
  "/service/loss-analysis": { name: "流失分析", group: "智能客服系统", subGroup: "数据洞察" },
  "/service/faq-stats": { name: "问答统计", group: "智能客服系统", subGroup: "数据洞察" },

  // 知识与培训
  "/knowledge/categories": { name: "知识库分类", group: "知识与培训", subGroup: "知识库" },
  "/knowledge/faq-candidates": { name: "问答库", group: "知识与培训", subGroup: "知识库" },
  "/knowledge/articles": { name: "文章管理", group: "知识与培训", subGroup: "知识库" },
  "/exam/papers": { name: "试卷管理", group: "知识与培训", subGroup: "考试测评" },
  "/exam/plans": { name: "考试计划", group: "知识与培训", subGroup: "考试测评" },
  "/exam/my": { name: "我的考试", group: "知识与培训", subGroup: "考试测评" },
  "/exam/results": { name: "考试结果", group: "知识与培训", subGroup: "考试测评" },

  // 考勤与审批
  "/attendance/groups": { name: "考勤组配置", group: "考勤与审批", subGroup: "考勤管理" },
  "/attendance/shifts": { name: "班次管理", group: "考勤与审批", subGroup: "考勤管理" },
  "/attendance/schedules": { name: "排班计划", group: "考勤与审批", subGroup: "考勤管理" },
  "/attendance/records": { name: "打卡记录", group: "考勤与审批", subGroup: "考勤管理" },
  "/attendance/requests": { name: "考勤申请", group: "考勤与审批", subGroup: "考勤管理" },
  "/approval/process": { name: "流程配置", group: "考勤与审批", subGroup: "审批中心" },
  "/approval/requests": { name: "我的审批", group: "考勤与审批", subGroup: "审批中心" },

  // 系统底层与日志
  "/system/messages": { name: "消息中心", group: "系统底层" },
  "/system/logs": { name: "操作日志", group: "系统日志" },
  "/system/menus": { name: "菜单路由", group: "系统底层", subGroup: "开发配置" },
  "/system/apis": { name: "API管理", group: "系统底层", subGroup: "开发配置" },
  "/system/buttons": { name: "按钮级权限", group: "系统底层", subGroup: "开发配置" },
  "/system/platforms": { name: "多租户与平台", group: "系统底层", subGroup: "环境配置" },
  "/system/shops": { name: "店铺授权", group: "系统底层", subGroup: "环境配置" },
  "/system/files": { name: "存储与文件", group: "系统底层", subGroup: "环境配置" },
};

const SORT_ORDER = [
  "工作台", "基础设置", "员工信息管理", "员工履历管理", "员工查询与导出",
  "AI设置", "智能客服系统", "知识与培训", "考勤与审批", "系统日志", "系统底层", "其他功能",
];

// 记录所有手动构造的占位路径（用于在点击时拦截导航）
const placeholderPaths = new Set<string>();

const isGroupPath = (path?: string) => !path || placeholderPaths.has(path);
// ──────────────────────────────────────────────────────────────────────────────

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

  // 2. 菜单树构建
  const menuTree = useMemo(() => {
    if (!currentUser?.menus) return [];

    const groupIconMap: Record<string, React.ReactNode> = {
      "工作台": <DashboardOutlined />,
      "基础设置": <ControlOutlined />,
      "员工信息管理": <TeamOutlined />,
      "员工履历管理": <UserOutlined />,
      "员工查询与导出": <SearchOutlined />,
      "AI设置": <ThunderboltOutlined />,
      "智能客服系统": <RobotOutlined />,
      "知识与培训": <BulbOutlined />,
      "考勤与审批": <SafetyCertificateOutlined />,
      "系统日志": <DashboardOutlined />,
      "系统底层": <ControlOutlined />,
    };

    const baseMenus = [
      { path: "/", name: "工作台概览", icon: <DashboardOutlined /> }
    ];

    const list = currentUser.menus.filter(m => m.route);
    const groupedMenuMap = new Map<string, any>();

    // 清空旧的占位路径记录
    placeholderPaths.clear();

    list.forEach(m => {
      let routeInfo = ROUTE_DICTIONARY[m.route!];

      // 智能回退机制：当路由未在字典中注册时，通过前缀猜测所属模块，防止堆积在"其他功能"
      if (!routeInfo) {
        let group = "其他功能";
        const path = m.route || "";

        if (path.includes("/ai-") || path.includes("prompt")) {
          group = "AI设置";
        } else if (path.startsWith("/org/")) {
          group = "员工信息管理";
        } else if (path.startsWith("/service/")) {
          group = "智能客服系统";
        } else if (path.startsWith("/knowledge/") || path.startsWith("/exam/")) {
          group = "知识与培训";
        } else if (path.startsWith("/attendance/") || path.startsWith("/approval/")) {
          group = "考勤与审批";
        } else if (path.startsWith("/system/")) {
          group = "系统底层";
        }

        routeInfo = { name: m.menu_name || path, group };
      }

      const groupName = routeInfo.group;
      const subGroupName = routeInfo.subGroup;

      const groupPath = `/${groupName}`;
      if (!groupedMenuMap.has(groupName)) {
        placeholderPaths.add(groupPath);
        groupedMenuMap.set(groupName, {
          path: groupPath,
          name: groupName,
          icon: groupIconMap[groupName] || <AppstoreOutlined />,
          children: [],
        });
      }

      const groupNode = groupedMenuMap.get(groupName);

      if (subGroupName) {
        const subGroupPath = `/${groupName}/${subGroupName}`;
        let subGroupNode = groupNode.children.find((c: any) => c.name === subGroupName);
        if (!subGroupNode) {
          placeholderPaths.add(subGroupPath);
          subGroupNode = {
            path: subGroupPath,
            name: subGroupName,
            children: [],
          };
          groupNode.children.push(subGroupNode);
        }
        subGroupNode.children.push({ path: m.route, name: routeInfo.name, icon: null });
      } else {
        groupNode.children.push({ path: m.route, name: routeInfo.name, icon: null });
      }
    });

    const groupedMenus = Array.from(groupedMenuMap.values());
    groupedMenus.sort((a, b) => {
      const wA = SORT_ORDER.indexOf(a.name) === -1 ? 999 : SORT_ORDER.indexOf(a.name);
      const wB = SORT_ORDER.indexOf(b.name) === -1 ? 999 : SORT_ORDER.indexOf(b.name);
      return wA - wB;
    });

    return [...baseMenus, ...groupedMenus.filter(g => g.children.length > 0)];
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
        ...enterpriseThemeConfig,
        algorithm: algorithm, // 使用动态的暗色/亮色算法
      }}
    >
      <div id="pro-layout-container" style={{ height: "100vh" }}>
        <RealtimeNotificationCenter lastEvent={lastMessageEvent} />

        <MenuSearch
          menuData={menuTree}
          visible={searchVisible}
          onCancel={() => setSearchVisible(false)}
        />

        <ProLayout
          title="控制台"
          logo={
            <div style={{
              width: 32, height: 32,
              background: '#0F172A',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>AI</span>
            </div>
          }
          layout="mix"
          fixedHeader
          fixSiderbar
          location={location}
          menu={{
            accordion: true,
          }}
          menuDataRender={() => menuTree}
          menuItemRender={(_item, dom) => (
            <span style={{ display: 'block', width: '100%', padding: '2px 0' }}>{dom}</span>
          )}
          menuProps={{
            onClick: ({ key }: { key: string }) => {
              if (!isGroupPath(key)) {
                navigate(key);
              }
            },
          }}
          headerContentRender={() => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginLeft: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  padding: '0 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  width: '320px',
                  height: '36px',
                  border: '1px solid #E2E8F0',
                  transition: 'all 0.2s',
                }}
                className="top-search-trigger"
                onClick={() => setSearchVisible(true)}
              >
                <SearchOutlined style={{ color: '#94A3B8', marginRight: 10, fontSize: 14 }} />
                <span style={{ fontSize: '13px', flex: 1, color: '#94A3B8' }}>快速全局搜索...</span>
                <div style={{
                  fontSize: '10px',
                  color: '#94A3B8',
                  background: '#FFFFFF',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  fontWeight: 600,
                }}>⌘K</div>
              </div>
            </div>
          )}
          actionsRender={() => [<RightContent key="right-content" />]}
          avatarProps={false}
          siderWidth={240} // 稍微加宽侧边栏，增加呼吸感
          token={{
            sider: {
              colorMenuBackground: "#FFFFFF",
              colorTextMenu: "#475569",
              colorTextMenuSelected: "#0F172A",
              colorBgMenuItemSelected: "#F1F5F9",
            },
            header: {
              heightLayoutHeader: 56,
              colorBgHeader: "#FFFFFF",
              colorHeaderTitle: "#0F172A",
              colorTextRightActionsItem: "#475569",
            },
          }}
        >
          <PageContainer
            header={{
              title: null,
              breadcrumb: {},
            }}
            style={{ padding: '0px' }}
          >
            <div style={{ padding: '24px', minHeight: 'calc(100vh - 56px)' }}>
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </div>
          </PageContainer>
        </ProLayout>
        <FloatingChat />
      </div>

      <style>{`
        /* 极致简约布局覆盖 */
        .ant-pro-layout-header {
          border-bottom: 1px solid #F1F5F9 !important;
          box-shadow: none !important;
        }

        .ant-layout-sider {
          border-right: 1px solid #F1F5F9 !important;
        }

        .top-search-trigger {
          background: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 6px !important;
          transition: all 0.2s;
        }

        .top-search-trigger:hover {
          border-color: #94A3B8 !important;
        }

        /* 移除所有额外动画 */
        * {
          animation: none !important;
          transition: border-color 0.2s, background 0.2s, color 0.2s !important;
        }

        .ant-table-thead > tr > th {
          font-weight: 600 !important;
          color: #475569 !important;
          border-bottom: 1px solid #F1F5F9 !important;
        }
      `}</style>
    </ConfigProvider>

  );
}
