import React from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';

export interface LogTableProps {
  dataSource: any[];
  loading?: boolean;
  pagination: TablePaginationConfig;
  onPageChange: (page: number, pageSize: number) => void;
  onViewDetail: (record: any) => void;
  tableType: 'operation' | 'login';
}

/**
 * 日志表格组件（可复用）
 * 支持操作日志和登录日志两种类型
 */
export const LogTable: React.FC<LogTableProps> = ({
  dataSource,
  loading,
  pagination,
  onPageChange,
  onViewDetail,
  tableType,
}) => {
  // 操作日志列定义
  const operationColumns: ColumnsType<any> = [
    {
      title: '操作时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120,
      render: (text: string, record: any) => text || record.username || '-',
    },
    {
      title: '操作模块',
      dataIndex: 'operation_module',
      key: 'operation_module',
      width: 120,
    },
    {
      title: '请求方式',
      dataIndex: 'request_method',
      key: 'request_method',
      width: 100,
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          GET: 'blue',
          POST: 'green',
          PUT: 'orange',
          DELETE: 'red',
          PATCH: 'purple',
        };
        return <Tag color={colorMap[text] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: '操作接口',
      dataIndex: 'api_path',
      key: 'api_path',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'operation_status',
      key: 'operation_status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'error'}>
          {status === 1 ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '执行时间',
      dataIndex: 'execution_time',
      key: 'execution_time',
      width: 100,
      render: (time: number) => (time ? `${time}ms` : '-'),
    },
    {
      title: '操作IP',
      dataIndex: 'request_ip',
      key: 'request_ip',
      width: 140,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  // 登录日志列定义
  const loginColumns: ColumnsType<any> = [
    {
      title: '登录时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 180,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '登录人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120,
      render: (text: string, record: any) => text || record.username || '-',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '登录IP',
      dataIndex: 'login_ip',
      key: 'login_ip',
      width: 140,
    },
    {
      title: '登录方式',
      dataIndex: 'login_method',
      key: 'login_method',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, { text: string; color: string }> = {
          password: { text: '密码登录', color: 'blue' },
          sms: { text: '短信登录', color: 'green' },
          wechat: { text: '微信登录', color: 'orange' },
        };
        const info = methodMap[method] || { text: method || '密码登录', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '设备类型',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          pc: { text: 'PC', color: 'blue' },
          mobile: { text: '移动端', color: 'green' },
          tablet: { text: '平板', color: 'orange' },
        };
        const info = typeMap[type] || { text: type || 'PC', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'login_status',
      key: 'login_status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'error'}>
          {status === 1 ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '结果描述',
      dataIndex: 'login_message',
      key: 'login_message',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const columns = tableType === 'operation' ? operationColumns : loginColumns;

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={loading}
      rowKey="id"
      pagination={{
        ...pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100'],
        onChange: onPageChange,
      }}
      scroll={{ x: 1200 }}
    />
  );
};
