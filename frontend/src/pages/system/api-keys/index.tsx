import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Typography, Tag, message, Tooltip, Divider } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { BaseTable } from '@/components/table/BaseTable';
import { ActionGroup } from '@/components/common/ActionGroup';

const { Text } = Typography;

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 1. 数据查询
  const { data: platforms = [] } = useQuery({ queryKey: ['system-platforms'], queryFn: systemApi.listPlatforms });
  const { data: departments = [] } = useQuery({ queryKey: ['system-departments'], queryFn: systemApi.listDepartments });

  const columns: ProColumns<any>[] = [
    {
      title: '凭据名称',
      dataIndex: 'name',
      render: (text) => <Text className="font-black text-slate-900"><KeyOutlined className="mr-2" />{text}</Text>
    },
    {
      title: '服务类型',
      dataIndex: 'service_type',
      render: (t) => <Tag className="font-bold border-slate-300 uppercase">{t}</Tag>
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      render: (t) => <Text className="text-slate-400 font-mono">{(t as string).slice(0, 6)}****************{(t as string).slice(-4)}</Text>
    },
    {
      title: '分配范围',
      dataIndex: 'dept_id',
      render: (deptId, record) => {
        const p = (platforms as any[]).find(p => p.id === record.platform_id);
        const d = (departments as any[]).find(d => d.id === deptId);
        return (
          <Space direction="vertical" size={0}>
            <Text className="text-xs text-slate-500">{p?.name}</Text>
            <Tag color={deptId ? 'blue' : 'gold'} className="font-black">
              {deptId ? `部门专享: ${d?.name}` : '✨ 平台全局共享'}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 1 ? 'success' : 'default'} className="font-bold border-2">{s === 1 ? '启用' : '禁用'}</Tag>
    },
    {
      title: '操作',
      valueType: 'option',
      render: () => <ActionGroup onEdit={() => setOpen(true)} editPermission="system:integration:save" />
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <Card bordered={false} className="shadow-sm">
        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-4">
          <Form.Item name="name" className="flex-grow min-w-[200px] mb-0"><Input prefix={<SearchOutlined />} placeholder="搜索凭据名称" className="h-[44px]" /></Form.Item>
          <Form.Item className="mb-0">
            <Space>
              <Button icon={<ReloadOutlined />} className="h-[44px] border-slate-500 font-bold">重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} className="h-[44px] font-bold">新增凭据</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm">
        <BaseTable columns={columns} dataSource={[]} rowKey="id" />
      </Card>

      <BaseModal
        open={open}
        title={<Text className="font-black text-lg"><SafetyCertificateOutlined className="mr-2" />配置 API 凭据</Text>}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 1 }}>
          <Form.Item label="凭据名称" name="name" rules={[{ required: true }]}><Input placeholder="如：OpenAI 官方 Key" className="font-bold text-slate-900" /></Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="服务类型" name="service_type" rules={[{ required: true }]}>
              <Select options={[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Claude', value: 'claude' },
                { label: '阿里云', value: 'aliyun' },
                { label: '淘宝 API', value: 'taobao' }
              ]} />
            </Form.Item>
            <Form.Item label="状态" name="status"><Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} /></Form.Item>
          </div>

          <Form.Item label="API Key" name="api_key" rules={[{ required: true }]}><Input.Password placeholder="sk-..." /></Form.Item>
          <Form.Item label="API Secret (可选)" name="api_secret"><Input.Password /></Form.Item>
          <Form.Item label="API Endpoint (可选)" name="endpoint"><Input placeholder="https://api.openai.com/v1" /></Form.Item>

          <Divider orientation="left"><Text className="font-black text-slate-600 text-sm">权限分配 (Hierarchy)</Text></Divider>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="归属平台" name="platform_id" rules={[{ required: true }]}>
                <Select options={(platforms as any[]).map(p => ({ label: p.name, value: p.id }))} />
              </Form.Item>
              <Form.Item label="分配至部门 (可选)" name="dept_id" tooltip="留空则该平台下所有部门共享此 Key">
                <Select allowClear placeholder="全局共享" options={(departments as any[]).map(d => ({ label: d.name, value: d.id }))} />
              </Form.Item>
            </div>
          </div>
        </Form>
      </BaseModal>
    </div>
  );
}
