import { useState } from "react";
import {
  Card,
  Table,
  Space,
  Button,
  Tag,
  DatePicker,
  Select,
  Input,
  Tooltip,
  message,
} from "antd";
import {
  ExportOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { downloadJSON } from "@/utils/fileDownload";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleExportWithProgress } from "@/utils/ui-helpers";
import type { ColumnsType } from "antd/es/table";
import "./index.less";

const { RangePicker } = DatePicker;

interface OperationLog {
  id: string;
  create_time: string;
  operator_name: string;
  operation_type: string;
  operation_content: string;
  ip_address: string;
  status: number;
  error_message?: string;
}

export default function OperationLogsPage() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);
  const [filters, setFilters] = useState<{
    operationType?: string;
    operatorId?: string;
    startTime?: string;
    endTime?: string;
    status?: number;
  }>({});

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+r": () => refetch(),
    "Ctrl+e": () => handleExport(),
  });

  // 模拟API调用 - 实际项目中替换为真实API
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["operation-logs", filters, debouncedKeyword],
    queryFn: async () => {
      // TODO: 替换为实际API调用
      // return await systemApi.getOperationLogs({...filters, keyword: debouncedKeyword});

      // 模拟数据
      return [
        {
          id: "1",
          create_time: "2026-04-15 10:30:25",
          operator_name: "张三",
          operation_type: "assign",
          operation_content: '为角色"部门主管"分配了5项权限',
          ip_address: "192.168.1.100",
          status: 1,
        },
        {
          id: "2",
          create_time: "2026-04-15 10:28:15",
          operator_name: "李四",
          operation_type: "create",
          operation_content: '创建了权限模板"市场部模板"',
          ip_address: "192.168.1.101",
          status: 1,
        },
        {
          id: "3",
          create_time: "2026-04-15 10:25:10",
          operator_name: "王五",
          operation_type: "delete",
          operation_content: '删除了角色"临时角色"',
          ip_address: "192.168.1.102",
          status: 0,
          error_message: "角色正在被使用，无法删除",
        },
      ] as OperationLog[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleExport = async () => {
    if (logs.length === 0) {
      message.warning("暂无数据可导出");
      return;
    }

    await handleExportWithProgress(async () => {
      const exportData = logs.map((log) => ({
        操作时间: log.create_time,
        操作人: log.operator_name,
        操作类型: getOperationTypeText(log.operation_type),
        操作内容: log.operation_content,
        IP地址: log.ip_address,
        状态: log.status === 1 ? "成功" : "失败",
        错误信息: log.error_message || "-",
      }));

      downloadJSON(
        { data: exportData },
        `operation-logs-${new Date().getTime()}`,
      );
    });
  };

  const getOperationTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      create: "创建",
      update: "更新",
      delete: "删除",
      assign: "分配权限",
      revoke: "取消权限",
      batch_assign: "批量分配",
      batch_revoke: "批量取消",
      template_apply: "应用模板",
    };
    return typeMap[type] || type;
  };

  const getOperationTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      create: "green",
      update: "blue",
      delete: "red",
      assign: "purple",
      revoke: "orange",
      batch_assign: "cyan",
      batch_revoke: "magenta",
      template_apply: "geekblue",
    };
    return colorMap[type] || "default";
  };

  const columns: ColumnsType<OperationLog> = [
    {
      title: "操作时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
      sorter: (a, b) =>
        new Date(a.create_time).getTime() - new Date(b.create_time).getTime(),
    },
    {
      title: "操作人",
      dataIndex: "operator_name",
      key: "operator_name",
      width: 120,
    },
    {
      title: "操作类型",
      dataIndex: "operation_type",
      key: "operation_type",
      width: 120,
      render: (type: string) => (
        <Tag color={getOperationTypeColor(type)}>
          {getOperationTypeText(type)}
        </Tag>
      ),
    },
    {
      title: "操作内容",
      dataIndex: "operation_content",
      key: "operation_content",
      ellipsis: {
        showTitle: false,
      },
      render: (content: string) => (
        <Tooltip title={content}>
          <span>{content}</span>
        </Tooltip>
      ),
    },
    {
      title: "IP地址",
      dataIndex: "ip_address",
      key: "ip_address",
      width: 150,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number, record: OperationLog) => (
        <Tooltip title={record.error_message}>
          <Tag color={status === 1 ? "success" : "error"}>
            {status === 1 ? "成功" : "失败"}
          </Tag>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="operation-logs-page">
      <GlobalLoading loading={isLoading}>
        <Card>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* 页面标题 */}
            <div className="page-header">
              <Space>
                <h2>操作日志</h2>
                <Tag color="blue">{logs.length} 条记录</Tag>
              </Space>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                  刷新
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                  disabled={logs.length === 0}
                >
                  导出日志
                </Button>
              </Space>
            </div>

            {/* 筛选条件 */}
            <Card
              size="small"
              title={
                <Space>
                  <FilterOutlined />
                  筛选条件
                </Space>
              }
            >
              <Space wrap size="middle">
                <Select
                  placeholder="操作类型"
                  style={{ width: 150 }}
                  allowClear
                  onChange={(value) =>
                    setFilters({ ...filters, operationType: value })
                  }
                  options={[
                    { label: "创建", value: "create" },
                    { label: "更新", value: "update" },
                    { label: "删除", value: "delete" },
                    { label: "分配权限", value: "assign" },
                    { label: "取消权限", value: "revoke" },
                    { label: "批量分配", value: "batch_assign" },
                    { label: "批量取消", value: "batch_revoke" },
                    { label: "应用模板", value: "template_apply" },
                  ]}
                />
                <Select
                  placeholder="操作状态"
                  style={{ width: 120 }}
                  allowClear
                  onChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                  options={[
                    { label: "成功", value: 1 },
                    { label: "失败", value: 0 },
                  ]}
                />
                <RangePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  onChange={(dates) => {
                    setFilters({
                      ...filters,
                      startTime: dates?.[0]?.format("YYYY-MM-DD HH:mm:ss"),
                      endTime: dates?.[1]?.format("YYYY-MM-DD HH:mm:ss"),
                    });
                  }}
                />
                <Input
                  placeholder="搜索操作内容"
                  prefix={<SearchOutlined />}
                  style={{ width: 250 }}
                  allowClear
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </Space>
            </Card>

            {/* 数据表格 */}
            <Table
              rowKey="id"
              columns={columns}
              dataSource={logs}
              loading={isLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
                defaultPageSize: 20,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              scroll={{ x: 1200 }}
            />
          </Space>
        </Card>
      </GlobalLoading>
    </div>
  );
}
