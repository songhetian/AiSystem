import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Card, Input, Space, Tabs, Tag } from 'antd';
import { systemApi } from '@/api/system';
import { BaseTable } from '@/components/table/BaseTable';

type TabKey = 'login' | 'operation';

interface LoginLogRecord {
  id: string;
  username: string;
  login_ip?: string;
  user_agent?: string;
  login_status: number;
  login_message?: string;
  create_time: string;
}

interface OperationLogRecord {
  id: string;
  username?: string;
  request_method: string;
  api_path: string;
  api_name?: string;
  operation_module?: string;
  request_ip?: string;
  operation_status: number;
  operation_message?: string;
  create_time: string;
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }
  return value.replace('T', ' ').slice(0, 19);
}

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('login');
  const [keyword, setKeyword] = useState('');

  const params = useMemo(() => (keyword ? { keyword } : undefined), [keyword]);

  const { data = [], isLoading } = useQuery<Array<LoginLogRecord | OperationLogRecord>>({
    queryKey: ['system-logs', activeTab, params],
    queryFn: () => (activeTab === 'login' ? systemApi.listLoginLogs(params) : systemApi.listOperationLogs(params))
  });

  const loginColumns: ProColumns<LoginLogRecord>[] = [
    { title: '用户名', dataIndex: 'username' },
    { title: '登录时间', dataIndex: 'create_time', render: (_, record) => formatDateTime(record.create_time) },
    { title: '登录 IP', dataIndex: 'login_ip' },
    {
      title: '状态',
      dataIndex: 'login_status',
      render: (_, record) => (record.login_status === 1 ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>)
    },
    { title: '结果说明', dataIndex: 'login_message', ellipsis: true },
    { title: '终端', dataIndex: 'user_agent', ellipsis: true }
  ];

  const operationColumns: ProColumns<OperationLogRecord>[] = [
    { title: '操作时间', dataIndex: 'create_time', render: (_, record) => formatDateTime(record.create_time) },
    { title: '用户', dataIndex: 'username' },
    { title: '方法', dataIndex: 'request_method' },
    { title: '路径', dataIndex: 'api_path', ellipsis: true },
    { title: '模块', dataIndex: 'operation_module' },
    { title: '权限码', dataIndex: 'api_name', ellipsis: true },
    { title: 'IP', dataIndex: 'request_ip' },
    {
      title: '状态',
      dataIndex: 'operation_status',
      render: (_, record) => (record.operation_status === 1 ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>)
    },
    { title: '结果说明', dataIndex: 'operation_message', ellipsis: true }
  ];

  return (
    <Card
      title="系统日志"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索用户名 / IP / 接口路径"
            style={{ width: 260 }}
            onSearch={(value) => setKeyword(value.trim())}
            onChange={(event) => {
              if (!event.target.value) {
                setKeyword('');
              }
            }}
          />
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={[
          { key: 'login', label: '登录日志' },
          { key: 'operation', label: '操作日志' }
        ]}
      />

      {activeTab === 'login' ? (
        <BaseTable<LoginLogRecord> rowKey="id" columns={loginColumns} dataSource={data as LoginLogRecord[]} loading={isLoading} />
      ) : (
        <BaseTable<OperationLogRecord>
          rowKey="id"
          columns={operationColumns}
          dataSource={data as OperationLogRecord[]}
          loading={isLoading}
        />
      )}
    </Card>
  );
}
