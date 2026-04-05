import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Input, Space, Tag } from 'antd';
import { systemApi } from '@/api/system';
import { BaseTable } from '@/components/table/BaseTable';
import { Permission } from '@/components/permission/Permission';

interface MessageRecord {
  id: string;
  title: string;
  content: string;
  message_type: string;
  route?: string;
  read_status: number;
  read_time?: string;
  create_time: string;
  sender_name?: string;
}

export default function SystemMessagesPage() {
  const [keyword, setKeyword] = useState('');
  const [readStatus, setReadStatus] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery<MessageRecord[]>({
    queryKey: ['system-messages', keyword, readStatus],
    queryFn: () =>
      systemApi.listMessages({
        keyword: keyword || undefined,
        read_status: readStatus
      })
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['system-messages'] });
  };

  const markReadMutation = useMutation({
    mutationFn: systemApi.markMessageRead,
    onSuccess: refresh
  });

  const markAllReadMutation = useMutation({
    mutationFn: systemApi.markAllMessagesRead,
    onSuccess: refresh
  });

  const unreadCount = useMemo(() => data.filter((item) => item.read_status === 0).length, [data]);

  const columns: ProColumns<MessageRecord>[] = [
    { title: '标题', dataIndex: 'title' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '类型', dataIndex: 'message_type' },
    { title: '发送人', dataIndex: 'sender_name', render: (_, record) => record.sender_name || '-' },
    {
      title: '状态',
      dataIndex: 'read_status',
      render: (_, record) => (record.read_status === 1 ? <Tag color="default">已读</Tag> : <Tag color="processing">未读</Tag>)
    },
    { title: '创建时间', dataIndex: 'create_time' },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          {record.read_status === 0 ? (
            <Permission code="system:message:read">
              <Button type="link" onClick={() => markReadMutation.mutate(record.id)}>
                标记已读
              </Button>
            </Permission>
          ) : null}
          {record.route ? (
            <Button type="link" href={record.route}>
              查看
            </Button>
          ) : null}
        </Space>
      )
    }
  ];

  return (
    <Card
      title="站内消息"
      extra={
        <Space>
          <Input.Search allowClear placeholder="搜索标题或内容" onSearch={setKeyword} style={{ width: 260 }} />
          <Button onClick={() => setReadStatus(undefined)}>全部</Button>
          <Button onClick={() => setReadStatus(0)}>未读 {unreadCount}</Button>
          <Button onClick={() => setReadStatus(1)}>已读</Button>
          <Permission code="system:message:read">
            <Button type="primary" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
              全部已读
            </Button>
          </Permission>
        </Space>
      }
    >
      <BaseTable<MessageRecord> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />
    </Card>
  );
}
