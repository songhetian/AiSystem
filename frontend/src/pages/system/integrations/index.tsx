import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Typography, Tag, Divider, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, ApiOutlined, LinkOutlined } from '@ant-design/icons';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';
import { ActionGroup } from '@/components/common/ActionGroup';

const { Text, Title } = Typography;

export default function DataIntegrationPage() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 1. 数据查询
  const { data: platforms = [] } = useQuery({
    queryKey: ['system-platforms'],
    queryFn: systemApi.listPlatforms
  });

  const columns: ProColumns<any>[] = [
    {
      title: '来源名称',
      dataIndex: 'source_name',
      render: (text) => <Text className="font-black text-slate-900"><ApiOutlined className="mr-2" />{text}</Text>
    },
    {
      title: '接口地址',
      dataIndex: 'api_endpoint',
      render: (text) => <Text className="text-slate-500 text-xs" copyable>{text}</Text>
    },
    {
      title: '映射规则',
      dataIndex: 'mapping_json',
      render: (json: any) => (
        <Space size={4} wrap>
          {Object.keys(json || {}).map(k => (
            <Tag key={k} className="font-bold border-blue-200 text-blue-600 bg-blue-50">
              {k} ↔ {json[k]}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => <Tag color={status === 1 ? 'success' : 'default'} className="font-black border-2">{status === 1 ? '生效中' : '已停用'}</Tag>
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: () => <ActionGroup onEdit={() => setOpen(true)} editPermission="system:integration:save" />
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* 搜索筛选区 */}
      <Card bordered={false} className="shadow-sm">
        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-4">
          <Form.Item name="name" className="flex-grow min-w-[200px] mb-0">
            <Input prefix={<SearchOutlined />} placeholder="搜索数据源名称" className="h-[44px]" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space size={8}>
              <Button icon={<ReloadOutlined />} className="h-[44px] border-slate-500 font-bold">重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} className="h-[44px] font-bold">新增集成</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <Card bordered={false} className="shadow-sm">
        <BaseTable
          columns={columns}
          dataSource={[]} // 示例展示
          rowKey="id"
        />
      </Card>

      {/* 新增集成弹窗 */}
      <BaseModal
        open={open}
        title={<Text className="font-black text-lg"><LinkOutlined className="mr-2" />配置外部 API 数据映射</Text>}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="来源名称" name="source_name" rules={[{ required: true }]} tooltip="如：淘宝客服API">
              <Input placeholder="输入外部平台名称" className="font-bold text-slate-900" />
            </Form.Item>
            <Form.Item label="所属平台" name="platform_id" rules={[{ required: true }]}>
              <Select options={(platforms as any[]).map(p => ({ label: p.name, value: p.id }))} />
            </Form.Item>
          </div>

          <Form.Item label="API Endpoint" name="api_endpoint" rules={[{ required: true }]}>
            <Input placeholder="https://api.external.com/v1/sessions" />
          </Form.Item>

          <Divider orientation="left"><Text className="font-black text-slate-600 text-sm">字段映射 (Internal ↔ External)</Text></Divider>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex gap-4 items-center">
              <Input value="customer_nickname" disabled className="w-40 font-bold bg-white" />
              <Text className="font-black">←</Text>
              <Input placeholder="外部 JSON 字段名 (如: user_nick)" />
            </div>
            <div className="flex gap-4 items-center">
              <Input value="session_no" disabled className="w-40 font-bold bg-white" />
              <Text className="font-black">←</Text>
              <Input placeholder="外部 JSON 字段名 (如: tid)" />
            </div>
            <div className="flex gap-4 items-center">
              <Input value="content" disabled className="w-40 font-bold bg-white" />
              <Text className="font-black">←</Text>
              <Input placeholder="外部 JSON 字段名 (如: msg_content)" />
            </div>
          </div>

          <Form.Item label="状态" name="status" className="mt-4" initialValue={1}>
            <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
