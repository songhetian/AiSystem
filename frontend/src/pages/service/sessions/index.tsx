/**
 * 质检会话页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Segmented, Space, message, Badge, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  EyeOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button as UIButton } from '@/components/ui';
import {
  serviceApi,
  type ServiceAiOverview,
  type ServiceSessionRecord,
} from "@/api/service";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { defaultColumnConfig, getSessionColumns } from "./components/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { formatDate, formatDuration } from '@/utils/format';

// 质检会话页面组件
export default function ServiceSessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [riskView, setRiskView] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("service-sessions-columns", defaultColumnConfig),
  );
  const searchInputRef = useRef<any>(null);

  // 搜索防抖
  const debouncedKeyword = useDebounce(keyword, 500);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      queryClient.invalidateQueries({ queryKey: ["service-sessions"] });
      message.success("数据已刷新");
    },
    "Ctrl+e": () => {
      handleExport();
    },
  });

  const queryParams = useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      risk_level: riskView === "all" ? undefined : riskView,
    }),
    [debouncedKeyword, riskView],
  );

  // 数据查询
  const { data: sessions = [], isLoading } = useQuery<ServiceSessionRecord[]>({
    queryKey: ["service-sessions", queryParams],
    queryFn: () => serviceApi.listSessions(queryParams),
    staleTime: 5 * 60 * 1000,
  });

  // AI质检分析
  const analyzeMutation = useMutation({
    mutationFn: (id: string) =>
      serviceApi.analyzeSession(id, { mode: "manual" }),
    onSuccess: async () => {
      message.success("AI 质检已重新分析");
      await queryClient.invalidateQueries({ queryKey: ["service-sessions"] });
    },
  });

  // 导出数据
  const handleExport = () => {
    message.info("导出功能开发中...");
  };

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["service-sessions"] });
    message.success("数据已刷新");
  };

  // 表格列配置
  const columns = [
    {
      title: "会话信息",
      dataIndex: "id",
      key: "id",
      render: (_: any, record: ServiceSessionRecord) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
            ID: {record.id}
          </span>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            客户: {record.customer_name || '未知'}
          </span>
          {record.channel && (
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
              渠道: {record.channel}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: "会话时长",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      render: (_: any, record: ServiceSessionRecord) => (
        <span style={{ fontSize: '12px' }}>
          {formatDuration(record.duration)}
        </span>
      ),
    },
    {
      title: "消息数",
      dataIndex: "message_count",
      key: "message_count",
      width: 80,
      render: (_: any, record: ServiceSessionRecord) => (
        <span style={{ fontWeight: 'bold', color: '#2563eb' }}>
          {record.message_count}
        </span>
      ),
    },
    {
      title: "AI质检",
      dataIndex: "ai_analysis",
      key: "ai_analysis",
      width: 120,
      render: (_: any, record: ServiceSessionRecord) => {
        const analysis = record.latest_analysis;
        if (!analysis) {
          return <StatusTag status="default" text="未分析" />;
        }
        return (
          <Space direction="vertical" size={2}>
            <StatusTag
              status={analysis.quality_passed ? "success" : "error"}
              text={analysis.quality_passed ? "合格" : "不合格"}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              分数: {analysis.quality_score}
            </span>
          </Space>
        );
      },
    },
    {
      title: "风险等级",
      dataIndex: "risk_level",
      key: "risk_level",
      width: 100,
      render: (_: any, record: ServiceSessionRecord) => {
        const riskConfig = {
          high: { status: 'error' as const, text: '高危' },
          medium: { status: 'warning' as const, text: '中危' },
          low: { status: 'success' as const, text: '低危' },
        };
        const config = riskConfig[record.risk_level as keyof typeof riskConfig];
        return config ? (
          <StatusTag status={config.status} text={config.text} />
        ) : (
          <StatusTag status="default" text="未知" />
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (_: any, record: ServiceSessionRecord) => (
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {formatDate(record.created_at)}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: ServiceSessionRecord) => (
        <Space size={4}>
          <UIButton
            size="small"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/service/sessions/${record.id}`)}
          >
            详情
          </UIButton>
          <UIButton
            size="small"
            icon={<SyncOutlined />}
            loading={analyzeMutation.isPending}
            onClick={() => analyzeMutation.mutate(record.id)}
          >
            重新分析
          </UIButton>
        </Space>
      ),
    },
  ];

  // 页面渲染
  return (
    <PageContainer
      title="质检会话"
      subTitle="AI智能质检会话记录，实时监控客服质量"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: 'AI质检' },
          { title: '质检会话' },
        ],
      }}
    >
      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible glass>
        <FilterBar
          items={[
            {
              name: 'keyword',
              label: '关键词',
              type: 'input',
              placeholder: '搜索客户昵称、会话ID或关键词...',
              value: keyword,
              onChange: setKeyword,
            },
            {
              name: 'risk_level',
              label: '风险等级',
              type: 'select',
              value: riskView,
              onChange: setRiskView,
              options: [
                { label: '全部', value: 'all' },
                { label: '高危', value: 'high' },
                { label: '中危', value: 'medium' },
                { label: '低危', value: 'low' },
              ],
            },
          ]}
          glass
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard glass>
        <ActionBar
          actions={[
            {
              key: 'refresh',
              label: '刷新',
              icon: <ReloadOutlined />,
              type: 'primary',
              onClick: handleRefresh,
            },
            {
              key: 'export',
              label: '导出报表',
              icon: <BarChartOutlined />,
              onClick: handleExport,
            },
            {
              key: 'filter',
              label: '高级筛选',
              icon: <FilterOutlined />,
              onClick: () => message.info('高级筛选功能开发中...'),
            },
          ]}
          extra={
            <ColumnCustomizer
              columns={columns}
              onChange={setColumns}
              storageKey="service-sessions-columns"
            />
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={sessions}
          loading={isLoading}
          rowKey="id"
          glass
          density="compact"
          striped
          hoverable
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条会话`,
            defaultPageSize: 20,
          }}
          scroll={{ y: 'calc(100vh - 320px)' }}
        />
      </SectionCard>
    </PageContainer>
  );
}
