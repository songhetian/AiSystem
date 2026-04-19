import React from "react";
import { Button, Space, Tag, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { Permission } from "@/components/permission/Permission";
import type { ColumnConfig } from "@/components/table/ColumnCustomizer";
import type { ServiceSessionRecord } from "@/api/service";

const { Text } = Typography;

/**
 * 默认列配置
 */
export const defaultColumnConfig: ColumnConfig[] = [
  { key: "session_no", title: "会话编号", visible: true, fixed: true },
  { key: "customer_agent", title: "客户 / 客服", visible: true },
  { key: "start_time", title: "开始时间", visible: false },
  { key: "end_time", title: "结束时间", visible: false },
  { key: "duration", title: "会话时长", visible: false },
  { key: "message_count", title: "消息数", visible: false },
  { key: "ai_analysis", title: "AI 质检", visible: true },
  { key: "risk_level", title: "风险等级", visible: false },
  { key: "status", title: "状态", visible: true },
  { key: "actions", title: "操作", visible: true, fixed: true },
];

/**
 * 获取客服会话列配置
 */
export const getSessionColumns = (
  columnConfig: ColumnConfig[] | null,
  handlers: {
    onViewDetail: (id: string) => void;
    onReAnalyze: (id: string) => void;
    isAnalyzing: boolean;
  },
): ProColumns<ServiceSessionRecord>[] => {
  const allColumns: ProColumns<ServiceSessionRecord>[] = [
    {
      key: "session_no",
      title: "会话编号",
      dataIndex: "session_no",
      width: 180,
      className: "leixi-text-main",
    },
    {
      key: "customer_agent",
      title: "客户 / 客服",
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="leixi-text-main font-bold">
            {record.customer_nickname || "匿名客户"}
          </Text>
          <Text className="leixi-text-secondary text-xs">
            {record.agent_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      key: "start_time",
      title: "开始时间",
      dataIndex: "start_time",
      width: 160,
      render: (_: any, record: ServiceSessionRecord) => (
        <Text className="leixi-text-secondary text-xs">{record.start_time || "-"}</Text>
      ),
    },
    {
      key: "end_time",
      title: "结束时间",
      dataIndex: "end_time",
      width: 160,
      render: (_: any, record: ServiceSessionRecord) => (
        <Text className="leixi-text-secondary text-xs">{record.end_time || "-"}</Text>
      ),
    },
    {
      key: "duration",
      title: "会话时长",
      dataIndex: "duration",
      width: 120,
      render: (_: any, record: ServiceSessionRecord) => {
        const val = record.duration;
        if (!val) return "-";
        const minutes = Math.floor(val / 60);
        const seconds = val % 60;
        return (
          <Text className="leixi-text-main">
            {minutes > 0 ? `${minutes}分` : ""}
            {seconds}秒
          </Text>
        );
      },
    },
    {
      key: "message_count",
      title: "消息数",
      dataIndex: "message_count",
      width: 100,
      render: (_: any, record: ServiceSessionRecord) => (
        <Text className="leixi-text-main">{record.message_count || 0}</Text>
      ),
    },
    {
      key: "ai_analysis",
      title: "AI 质检",
      width: 150,
      render: (_, record) => {
        const analysis = record.latest_analysis;
        if (!analysis) return <Tag>未分析</Tag>;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={analysis.quality_passed ? "success" : "error"}>
              {analysis.quality_passed ? "合格" : "不合格"}
            </Tag>
            <Text className="leixi-text-secondary text-xs">
              分 {analysis.quality_score}
            </Text>
          </Space>
        );
      },
    },
    {
      key: "risk_level",
      title: "风险等级",
      dataIndex: "risk_level",
      width: 100,
      render: (_: any, record: ServiceSessionRecord) => {
        const val = record.risk_level;
        const colorMap: Record<string, string> = {
          high: "error",
          medium: "warning",
          low: "success",
        };
        const textMap: Record<string, string> = {
          high: "高风险",
          medium: "中风险",
          low: "低风险",
        };
        return <Tag color={colorMap[val as string]}>{textMap[val as string] || "-"}</Tag>;
      },
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (val) => <Tag>{val}</Tag>,
    },
    {
      key: "actions",
      title: "操作",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handlers.onViewDetail(record.id)}>
            详情
          </Button>
          <Permission code="service:quality:analyze">
            <Button
              type="link"
              loading={handlers.isAnalyzing}
              onClick={() => handlers.onReAnalyze(record.id)}
            >
              重分析
            </Button>
          </Permission>
        </Space>
      ),
    },
  ];

  // 如果有列配置，则过滤列
  if (columnConfig) {
    const visibleKeys = new Set(
      columnConfig.filter((c) => c.visible).map((c) => c.key),
    );
    return columnConfig
      .filter((c) => c.visible)
      .map((c) => allColumns.find((col) => col.key === c.key))
      .filter(Boolean) as ProColumns<ServiceSessionRecord>[];
  }

  return allColumns;
};
