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
import FloatingChat from "@/components/common/FloatingChat";
import { MenuSearch } from "@/components/common/MenuSearch";
import { RightContent } from "@/components/RightContent";

const { Text, Title } = Typography;
const { useToken } = theme;

// ─── 静态常量移出组件，避免每次渲染重新创建 ───────────────────────────────
const ROUTE_DICTIONARY: Record<string, { name: string; group: string; subGroup?: string }> = {
  // 人员管理
  "/system/users": { name: "系统用户", group: "人员管理" },
  "/org/employees": { name: "员工档案", group: "人员管理" },
  "/org/staff": { name: "员工配置", group: "人员管理" },

  // 架构管理
  "/org/departments": { name: "业务部门", group: "架构管理" },
  "/system/departments": { name: "系统部门", group: "架构管理" },
  "/org/positions": { name: "职位设置", group: "架构管理" },
  "/system/roles": { name: "角色与权限", group: "架构管理" },

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

  // 系统底层
  "/system/messages": { name: "消息中心", group: "系统底层" },
  "/system/menus": { name: "菜单路由", group: "系统底层", subGroup: "开发配置" },
  "/system/apis": { name: "API管理", group: "系统底层", subGroup: "开发配置" },
  "/system/buttons": { name: "按钮级权限", group: "系统底层", subGroup: "开发配置" },
  "/system/platforms": { name: "多租户与平台", group: "系统底层", subGroup: "环境配置" },
  "/system/shops": { name: "店铺授权", group: "系统底层", subGroup: "环境配置" },
  "/system/files": { name: "存储与文件", group: "系统底层", subGroup: "环境配置" },
};

const SORT_ORDER = [
  "人员管理", "架构管理", "AI设置", "智能客服系统",
  "知识与培训", "考勤与审批", "系统底层", "其他功能",
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
      "人员管理": <UserOutlined />,
      "架构管理": <TeamOutlined />,
      "AI设置": <ThunderboltOutlined />,
      "智能客服系统": <RobotOutlined />,
      "知识与培训": <BulbOutlined />,
      "考勤与审批": <SafetyCertificateOutlined />,
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
      const routeInfo = ROUTE_DICTIONARY[m.route!] || { name: m.menu_name, group: "其他功能" };
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
        algorithm: algorithm,
        token: {
          borderRadius: 6,
          fontFamily: "'Inter', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorPrimary: '#2563eb',
          ...(isDark && {
            colorBgElevated: '#1e293b',
            colorBgContainer: '#0f172a',
            colorBorder: '#334155',
            colorBorderSecondary: '#1e293b',
            colorText: 'rgba(255,255,255,0.85)',
          })
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
          title="雷犀"
          logo={
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative light effect */}
              <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <svg width="20" height="14" viewBox="0 0 22 16" fill="none">
                <text x="0" y="13" fontFamily="'Inter','PingFang SC',sans-serif" fontWeight="800" fontSize="14" fill="white" letterSpacing="-0.5">AI</text>
              </svg>
              {/* Corner dot for "design sense" */}
              <div style={{ position: 'absolute', top: 3, right: 3, width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
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
            // 不使用 Link，避免与 ProLayout 内部导航双重触发冲突
            // 导航由下方 menuProps.onClick 统一处理
            <span style={{ display: 'block', width: '100%' }}>{dom}</span>
          )}
          menuProps={{
            onClick: ({ key }: { key: string }) => {
              // 只对真实路由节点执行跳转，分组/子分组标题不跳转
              if (!isGroupPath(key)) {
                navigate(key);
              }
            },
          }}
          headerContentRender={() => (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(255,255,255,0.1)',
                padding: '0 10px 0 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                width: '220px',
                height: '34px',
                marginLeft: '16px',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
              }}
              className="top-search-trigger"
              onClick={() => setSearchVisible(true)}
            >
              <SearchOutlined style={{ color: 'rgba(255,255,255,0.65)', marginRight: 8, fontSize: 13 }} />
              <span style={{ fontSize: '12.5px', flex: 1, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>搜索功能</span>
              <div style={{
                fontSize: '10px', 
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.08)',
                padding: '1px 4px', 
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'system-ui', 
                fontWeight: 600,
                lineHeight: '1',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px'
              }}>⌘K</div>
            </div>
          )}
          actionsRender={() => [<RightContent key="right-content" />]}
          avatarProps={false}
          siderWidth={220}
          token={{
            sider: {
              colorMenuBackground: isDark ? "#0f172a" : "#ffffff",
              colorTextMenu: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.72)",
              colorTextMenuSelected: "#ffffff",
              colorBgMenuItemSelected: isDark ? "#1d4ed8" : "#2f7af7",
              colorTextMenuItemHover: isDark ? "#ffffff" : "#2f7af7",
            },
            header: {
              heightLayoutHeader: 64,
              colorBgHeader: isDark ? "#1e293b" : "#2f7af7", // 暗色模式用 slate-800 保持品牌感
              colorHeaderTitle: "#ffffff",
              colorTextRightActionsItem: "#ffffff",
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
            {/* 使用 key 强制刷新 Outlet，解决路由卡死在错误页面的问题 */}
            <Outlet key={location.pathname} />
          </PageContainer>
        </ProLayout>
        <FloatingChat />
      </div>
      
      <style>{`
        body {
          font-weight: 400;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: ${isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'};
        }
        
        .top-search-trigger:hover {
          background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'} !important;
          border-color: rgba(255,255,255,0.3) !important;
        }

        /* 菜单字重 */
        .ant-menu-title-content {
          font-weight: 450 !important;
        }
        
        /* 菜单项与子菜单标题：背景色渐变，字色瞬切（避免字色滴在背景唙转中对齐失调） */
        .ant-menu-item,
        .ant-menu-submenu-title {
          transition: background-color 0.15s ease-in-out !important;
          border-radius: 6px !important;
        }
        
        /* 叶子节点悬停：轻蓝背景提示 */
        .ant-menu-item:not(.ant-menu-item-selected):hover {
          background-color: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,122,247,0.08)'} !important;
        }
        
        /* 子菜单分组标题悬停 */
        .ant-menu-submenu-title:hover {
          background-color: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,122,247,0.06)'} !important;
        }

        /* 内部文字、图标：直接瞬切，不做渐变，避免与背景渐变不同步 */
        .ant-menu-item .ant-menu-title-content,
        .ant-menu-item .anticon,
        .ant-menu-submenu-title .anticon {
          transition: none !important;
        }

        /* 侧边栏与头部边框 */
        .ant-layout-sider {
          border-right: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} !important;
        }
        .ant-pro-layout-header {
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#2e79f6'} !important;
          padding: 0 16px !important;
        }
        
        .ant-pro-global-header-layout-mix .ant-pro-global-header-logo h1 {
          color: #ffffff !important;
        }

        /* 顶部动作项悬停 */
        .header-action-item {
          transition: background-color 0.2s ease-in-out;
        }
        .header-action-item:hover {
          background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'};
        }
        
        .header-action-item .ant-btn-text {
          color: #ffffff !important;
        }
        .header-action-item .ant-btn-text:hover {
          background: transparent !important;
        }
      `}</style>
    </ConfigProvider>
  );
}
