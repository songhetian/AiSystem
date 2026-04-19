import React, { useState } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Empty,
  message,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import qualityPromptApi, { type AuditLog, type QueryAuditLogsParams } from '@/api/quality-prompt';
import { useDebounce } from '@/hooks/useDebounce';
import { downloadFile } from '@/utils/fileDownload';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * 审计日志列表组件
 * 显示所有Prompt操作的审计日志，支持搜索、筛选和导出
 *
 * 功能:
 * - 显示审计日志列表（操作时间、操作人、操作类型、Prompt名称等）
 * - 支持按操作人、操作类型、Prompt类型、日期范围搜索
 * - 支持导出审计日志到CSV
 * - 支持查看操作详情（before/after内容对比）
 *
 * 需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
export const AuditLogList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [operatorName, setOperatorName] = useState('');
  const [operationType, setOperationType] = useState<string | undefined>(undefined);
  const [promptType, setPromptType] = useState<'global' | 'department' | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  // 防抖搜索
  const debouncedOperatorName = useDebounce(operatorName, 500);

  // 构建查询参数
  const queryParams: QueryAuditLogsParams = {
    operator_id: debouncedOperatorName || undefined,
    operation_type: operationType,
    prompt_type: promptType,
    start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
    end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
    page,
    pageSize,
  };

  // 获取审计日志列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quality-prompt-audit-logs', queryParams],
    queryFn: () => qualityPromptApi.queryAuditLogs(queryParams),
  });

  // 操作类型选项
  const operationTypeOptions = [
    { label: '全部', value: undefined },
    { label: '创建', value: 'create' },
    { label: '编辑', value: 'edit' },
    { label: '删除', value: 'delete' },
    { label: '启用', value: 'enable' },
    { label: '禁用', value: 'disable' },
  ];

  // Prompt类型选项
  const promptTypeOptions = [
    { label: '全部', value: undefined },
    { label: '全局Prompt', value: 'global' },
    { label: '部门Prompt', value: 'department' },
  ];

  // 操作类型标签颜色映射
  const operationTypeColors: Record<string, string> = {
    create: 'green',
    edit: 'blue',
    delete: 'red',
    enable: 'cyan',
    disable: 'orange',
  };

  // 查看详情
  const handleViewDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setDetailDrawerOpen(true);
  };

  // 导出审计日志
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await qualityPromptApi.exportAuditLogs(queryParams);
      const filename = `审计日志_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      downloadFile(blob, filename);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 重置筛选条件
  const handleReset = () => {
    setOperatorName('');
    setOperationType(undefined);
    setPromptType(undefined);
    setDateRange(null);
    setPage(1);
  };

  // 刷新列表
  const handleRefresh = () => {
    refetch();
    message.success('已刷新');
  };

  // 表格列定义
  const columns: ColumnsType<AuditLog> = [
    {
      title: '操作时间',
      dataIndex: 'timestamp',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      width: 120,
      ellipsis: true,
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      width: 100,
      render: (type: string) => (
        <Tag color={operationTypeColors[type] || 'default'}>
          {operationTypeOptions.find((opt) => opt.value === type)?.label || type}
        </Tag>
      ),
    },
    {
      title: 'Prompt名称',
      dataIndex: 'prompt_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Prompt类型',
      dataIndex: 'prompt_type',
      width: 120,
      render: (type: 'global' | 'department') => (
        <Tag color={type === 'global' ? 'blue' : 'purple'}>
          {type === 'global' ? '全局Prompt' : '部门Prompt'}
        </Tag>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      width: 140,
      ellipsis: true,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="审计日志"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            title="刷新列表 (Ctrl+R)"
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            导出日志
          </Button>
        </Space>
      }
    >
      {/* 搜索筛选区域 */}
      <Space
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Input
          placeholder="搜索操作人"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 200 }}
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
        />
        <Select
          placeholder="操作类型"
          allowClear
          style={{ width: 150 }}
          value={operationType}
          onChange={setOperationType}
          options={operationTypeOptions}
        />
        <Select
          placeholder="Prompt类型"
          allowClear
          style={{ width: 150 }}
          value={promptType}
          onChange={setPromptType}
          options={promptTypeOptions}
        />
        <RangePicker
          placeholder={['开始日期', '结束日期']}
          style={{ width: 280 }}
          value={dateRange}
          onChange={setDateRange}
          format="YYYY-MM-DD"
        />
        <Button onClick={handleReset}>重置</Button>
      </Space>

      {/* 审计日志表格 */}
      <Table<AuditLog>
        rowKey="id"
        columns={columns}
        dataSource={data?.data || []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无审计日志"
            />
          ),
        }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title="操作详情"
        placement="right"
        width={720}
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedLog(null);
        }}
        destroyOnClose
      >
        {selectedLog && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="操作时间">
                {dayjs(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {selectedLog.operator_name} (ID: {selectedLog.operator_id})
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                <Tag color={operationTypeColors[selectedLog.operation_type] || 'default'}>
                  {operationTypeOptions.find((opt) => opt.value === selectedLog.operation_type)?.label ||
                    selectedLog.operation_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Prompt名称">
                {selectedLog.prompt_name}
              </Descriptions.Item>
              <Descriptions.Item label="Prompt ID">
                {selectedLog.prompt_id}
              </Descriptions.Item>
              <Descriptions.Item label="Prompt类型">
                <Tag color={selectedLog.prompt_type === 'global' ? 'blue' : 'purple'}>
                  {selectedLog.prompt_type === 'global' ? '全局Prompt' : '部门Prompt'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">
                {selectedLog.ip_address || '未记录'}
              </Descriptions.Item>
            </Descriptions>

            {/* 编辑操作显示前后内容对比 */}
            {selectedLog.operation_type === 'edit' && (
              <div style={{ marginTop: 24 }}>
                <h4>内容变更对比</h4>
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      padding: 12,
                      background: '#fff1f0',
                      border: '1px solid #ffccc7',
                      borderRadius: 4,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#cf1322' }}>
                      修改前:
                    </div>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        fontSize: 12,
                      }}
                    >
                      {selectedLog.before_content || '无内容'}
                    </pre>
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: 4,
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#389e0d' }}>
                      修改后:
                    </div>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        fontSize: 12,
                      }}
                    >
                      {selectedLog.after_content || '无内容'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* 删除操作显示原因 */}
            {selectedLog.operation_type === 'delete' && selectedLog.reason && (
              <div style={{ marginTop: 24 }}>
                <h4>删除原因</h4>
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: 4,
                  }}
                >
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                      fontSize: 12,
                    }}
                  >
                    {selectedLog.reason}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
};
