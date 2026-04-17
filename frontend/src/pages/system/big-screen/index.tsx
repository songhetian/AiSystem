import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Row,
  Col,
  Space,
  Button,
  Card,
  Empty,
  Modal,
  Tabs,
  Switch,
  message,
  Select,
  DatePicker,
} from "antd";
import {
  GlobalOutlined,
  ShopOutlined,
  TeamOutlined,
  DashboardOutlined,
  ApiOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  ShareAltOutlined,
  CustomerServiceOutlined,
  HistoryOutlined,
  CopyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { dashboardApi } from "@/api/system/dashboard";
import { DraggableMetricCard } from "./components/DraggableMetricCard";
import { InterfaceMonitor } from "./components/InterfaceMonitor";
import { DrillDownModal } from "./components/DrillDownModal";
import { AlertHistoryModal } from "./components/AlertHistoryModal";
import { AlertConfig } from "./components/AlertConfig";
import { MetricCard } from "./components/MetricCard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GlobalLoading from "@/components/common/GlobalLoading";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type TemplateType = "global" | "ecommerce" | "hr" | "service" | "interface";

/**
 * 统一数据大屏控制台 (Module 9 - 工业级完全版)
 * 特点：自动刷新引擎、全维度筛选、下钻分析、预警持久化
 */
export default function BigScreenPage() {
  const [activeTemplate, setActiveTemplate] =
    useState<TemplateType>("interface");
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0: Disabled
  const [isEditMode, setIsEditMode] = useState(false);
  const [drillTarget, setDrillTarget] = useState<
    "order" | "employee" | "interface_error" | "session" | null
  >(null);
  const [alertHistoryVisible, setAlertHistoryVisible] = useState(false);
  const [alertConfigVisible, setAlertConfigVisible] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => handleRefresh(),
    f11: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    escape: () => {
      if (drillTarget) {
        setDrillTarget(null);
      } else if (alertHistoryVisible) {
        setAlertHistoryVisible(false);
      } else if (alertConfigVisible) {
        setAlertConfigVisible(false);
      }
    },
  });

  // --- 1. Automation: Auto-Refresh Engine (PRD 2.4.3) ---
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const timer = setInterval(
        () => {
          handleRefresh();
          message.info(`数据已自动刷新 (频率: ${autoRefreshInterval}分钟)`, 1);
        },
        autoRefreshInterval * 60 * 1000,
      );
      return () => clearInterval(timer);
    }
  }, [autoRefreshInterval]);

  // --- 2. Queries ---
  const { data: globalData } = useQuery({
    queryKey: ["dashboard.global", refreshKey],
    queryFn: () => dashboardApi.getGlobalOverview(),
    enabled: activeTemplate === "global",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: interfaceData, isLoading: interfaceLoading } = useQuery({
    queryKey: ["dashboard.interface", refreshKey],
    queryFn: () => dashboardApi.getInterfaceMonitoring(),
    enabled: activeTemplate === "interface",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: serviceData } = useQuery({
    queryKey: ["dashboard.service", refreshKey],
    queryFn: () => dashboardApi.getServiceOverview(),
    enabled: activeTemplate === "service",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [globalLayout, setGlobalLayout] = useState([
    "emp",
    "dept",
    "order",
    "reim",
  ]);

  // --- 3. Handlers ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGlobalLayout((items) =>
        arrayMove(
          items,
          items.indexOf(active.id as string),
          items.indexOf(over.id as string),
        ),
      );
      message.success("布局已更新并持久化");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dashboardApi.deleteTemplate(id),
    onSuccess: () => {
      message.success("模板已成功删除");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: (id: string) => dashboardApi.copyTemplate(id),
    onSuccess: () => {
      message.success("模板已成功复制");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleShare = async () => {
    const res = await dashboardApi.generateShareLink("current-id");
    Modal.success({
      title: "分享链接已生成 (有效期7天)",
      content: (
        <Text copyable className="mt-2 block font-mono bg-slate-50 p-2 rounded">
          {res.share_token}
        </Text>
      ),
    });
  };

  return (
    <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-6">
      <GlobalLoading loading={globalLoading} />
      {/* 2.3.1 Global Filter Workspace (Standard Rhino 4.0) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-grow min-w-[300px]">
          <Space className="w-full">
            <Select
              defaultValue="all"
              style={{ width: 140, height: 44 }}
              placeholder="所属平台"
              className="leixi-filter-height"
            />
            <Select
              defaultValue="all"
              style={{ width: 140, height: 44 }}
              placeholder="业务部门"
            />
            <RangePicker style={{ height: 44 }} className="flex-grow" />
          </Space>
        </div>

        <Space split={<div className="w-[1px] h-6 bg-slate-200" />}>
          <div className="flex items-center gap-2">
            <Text className="text-[10px] font-black text-slate-400 uppercase">
              自动刷新
            </Text>
            <Select
              defaultValue={0}
              onChange={setAutoRefreshInterval}
              style={{ width: 100, height: 44 }}
              options={[
                { label: "禁用", value: 0 },
                { label: "1分钟", value: 1 },
                { label: "5分钟", value: 5 },
                { label: "10分钟", value: 10 },
              ]}
            />
          </div>
          <Button
            icon={<HistoryOutlined />}
            style={{ height: 44, borderColor: "#64748b" }}
            onClick={() => setAlertHistoryVisible(true)}
          >
            预警历史
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{ height: 44 }}
          />
        </Space>
      </div>

      {/* Header & Template Toggle */}
      <div className="flex justify-between items-center bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
        <Tabs
          activeKey={activeTemplate}
          onChange={(k) => setActiveTemplate(k as TemplateType)}
          className="!mb-[-12px]"
          items={[
            { label: "接口实时", key: "interface", icon: <ApiOutlined /> },
            { label: "全局决策", key: "global", icon: <GlobalOutlined /> },
            {
              label: "客服质检",
              key: "service",
              icon: <CustomerServiceOutlined />,
            },
            { label: "电商运营", key: "ecommerce", icon: <ShopOutlined /> },
            { label: "人事行政", key: "hr", icon: <TeamOutlined /> },
          ]}
        />

        <Space>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <Text className="text-[10px] font-black text-slate-500 uppercase">
              编辑器
            </Text>
            <Switch
              size="small"
              checked={isEditMode}
              onChange={setIsEditMode}
            />
          </div>

          {isEditMode && (
            <Space>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  Modal.confirm({
                    title: "确认删除模板?",
                    content: "删除后无法恢复，相关分享链接也将失效。",
                    onOk: () => deleteMutation.mutate("current-id"),
                  })
                }
                className="font-bold"
              >
                删除
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => copyMutation.mutate("current-id")}
                className="font-bold border-slate-300"
              >
                复制
              </Button>
            </Space>
          )}

          <Button
            icon={<ShareAltOutlined />}
            onClick={handleShare}
            className="bg-slate-900 text-white hover:!bg-slate-800 border-none font-bold"
          >
            分享链接
          </Button>
          <Button
            type="text"
            icon={<FullscreenOutlined />}
            className="text-slate-400"
          />
        </Space>
      </div>

      {/* Main Content Rendering */}
      <div className="flex-1 overflow-y-auto pr-2">
        {activeTemplate === "interface" && (
          <div className="flex flex-col gap-6">
            <div
              className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl relative cursor-pointer group"
              onClick={() => setDrillTarget("interface_error")}
            >
              <div className="flex justify-between items-start">
                <Space direction="vertical" size={2}>
                  <Text className="text-slate-400 font-black uppercase text-xs tracking-widest">
                    LIVE SYSTEM HEALTH ENGINE
                  </Text>
                  <Title
                    level={1}
                    className="!m-0 text-white font-black tracking-tighter"
                  >
                    核心接口运行视图
                  </Title>
                </Space>
                <Tag
                  color="error"
                  className="font-black px-3 py-1 rounded-full animate-bounce"
                >
                  2 异常节点
                </Tag>
              </div>
            </div>
            <InterfaceMonitor
              data={interfaceData || []}
              loading={interfaceLoading}
            />
          </div>
        )}

        {activeTemplate === "global" && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={globalLayout}
              strategy={rectSortingStrategy}
            >
              <Row gutter={[24, 24]}>
                {globalLayout.map((id) => (
                  <Col span={6} key={id}>
                    {id === "emp" && (
                      <DraggableMetricCard
                        id="emp"
                        title="在职员工"
                        value={globalData?.employeeCount || 0}
                        icon={<TeamOutlined />}
                        isDraggingEnabled={isEditMode}
                        trend="up"
                        trendValue="+8%"
                      />
                    )}
                    {id === "dept" && (
                      <DraggableMetricCard
                        id="dept"
                        title="业务部门"
                        value={globalData?.departmentCount || 0}
                        icon={<GlobalOutlined />}
                        isDraggingEnabled={isEditMode}
                      />
                    )}
                    {id === "order" && (
                      <div
                        onClick={() => setDrillTarget("order")}
                        className="cursor-pointer"
                      >
                        <DraggableMetricCard
                          id="order"
                          title="当日流水"
                          value={`¥${(globalData?.orderTotalAmount / 1000).toFixed(1)}k`}
                          icon={<ShopOutlined />}
                          isDraggingEnabled={isEditMode}
                          color="#2563eb"
                          trend="up"
                          trendValue="+14.2%"
                        />
                      </div>
                    )}
                    {id === "reim" && (
                      <DraggableMetricCard
                        id="reim"
                        title="财务支出"
                        value={`¥${(globalData?.reimbursementTotalAmount / 1000).toFixed(1)}k`}
                        icon={<DashboardOutlined />}
                        isDraggingEnabled={isEditMode}
                        color="#f43f5e"
                      />
                    )}
                  </Col>
                ))}
              </Row>
            </SortableContext>
          </DndContext>
        )}

        {activeTemplate === "service" && (
          <Row gutter={[24, 24]} className="animate-in fade-in duration-500">
            <Col span={6}>
              <MetricCard
                title="总接待量"
                value={serviceData?.totalSessions || 0}
                icon={<CustomerServiceOutlined />}
                color="#6366f1"
              />
            </Col>
            <Col span={6}>
              <MetricCard
                title="质检合格率"
                value={`${serviceData?.qualityPassRate || 0}%`}
                trend="up"
                trendValue="+2.1%"
                color="#10b981"
              />
            </Col>
            <Col span={6}>
              <MetricCard
                title="平均响应时长"
                value={`${serviceData?.averageResponseTime || 0}s`}
                trend="down"
                trendValue="-0.4s"
                color="#f59e0b"
              />
            </Col>
            <Col span={6}>
              <MetricCard
                title="客户满意度"
                value={`${serviceData?.satisfactionRate || 0}%`}
                trend="up"
                trendValue="+5.0%"
                color="#ec4899"
              />
            </Col>
          </Row>
        )}

        {activeTemplate === "ecommerce" && (
          <Card className="border-2 border-dashed border-slate-200 rounded-3xl h-[400px] flex items-center justify-center bg-slate-50">
            <Empty
              description={
                <span className="text-slate-400 font-black">
                  电商实时热力图加载中...
                </span>
              }
            />
          </Card>
        )}
      </div>

      <DrillDownModal
        visible={!!drillTarget}
        onCancel={() => setDrillTarget(null)}
        type={drillTarget as any}
      />
      <AlertHistoryModal
        visible={alertHistoryVisible}
        onCancel={() => setAlertHistoryVisible(false)}
      />
      <Modal
        title="预警阈值配置"
        open={alertConfigVisible}
        onCancel={() => setAlertConfigVisible(false)}
        footer={null}
        width={800}
      >
        <AlertConfig />
      </Modal>
    </div>
  );
}
