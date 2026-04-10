import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { systemApi } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';

const { Text, Title } = Typography;

interface ApiRecord {
  id: string;
  api_path: string;
  request_method: string;
  api_name: string;
  status: number;
  role_ids?: string[] | string;
}

interface ApiStats {
  summary: {
    total: number;
    success_rate: number;
  };
  timeline: Array<{
    time: string;
    total: number;
    success: number;
    failed: number;
  }>;
}

export default function SystemApisPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRecord | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [activeApiId, setActiveApiId] = useState<string | null>(null);
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: apis = [], isLoading } = useQuery<ApiRecord[]>({
    queryKey: ['system-apis'],
    queryFn: systemApi.listApis,
  });

  const { data: apiStats, isLoading: isStatsLoading } = useQuery<ApiStats | null>({
    queryKey: ['system-api-stats', activeApiId],
    queryFn: () => (activeApiId ? systemApi.getApiStats(activeApiId) : null),
    enabled: Boolean(activeApiId) && statsOpen,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['system-apis'] });

  const createMutation = useMutation({
    mutationFn: systemApi.createApi,
    onSuccess: () => {
      setOpen(false);
      form.resetFields();
      refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      systemApi.updateApi(id, payload),
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      form.resetFields();
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteApi,
    onSuccess: refresh,
  });

  const columns: ProColumns<ApiRecord>[] = [
    {
      title: '接口名称',
      dataIndex: 'api_name',
      render: (text) => <Text className="font-black text-slate-900">{text}</Text>,
    },
    {
      title: '请求方式',
      dataIndex: 'request_method',
      render: (method) => {
        const colors: Record<string, string> = {
          POST: 'blue',
          DELETE: 'red',
          PUT: 'orange',
          GET: 'green',
          PATCH: 'purple',
        };
        return (
          <Tag color={colors[String(method)]} className="border-2 font-black">
            {method}
          </Tag>
        );
      },
    },
    {
      title: '接口路径',
      dataIndex: 'api_path',
      className: 'font-mono text-xs text-slate-500',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'success' : 'default'} className="font-bold">
          {status === 1 ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<LineChartOutlined />}
            className="font-bold text-emerald-600"
            onClick={() => {
              setActiveApiId(record.id);
              setStatsOpen(true);
            }}
          >
            健康度
          </Button>
          <Permission code="system:api:update">
            <Button
              type="link"
              size="small"
              className="font-bold"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({
                  ...record,
                  role_ids: Array.isArray(record.role_ids) ? record.role_ids.join(', ') : record.role_ids || '',
                });
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
          <Permission code="system:api:delete">
            <Popconfirm title="确认删除该接口？" onConfirm={() => deleteMutation.mutate(record.id)}>
              <Button type="link" size="small" danger className="font-bold">
                删除
              </Button>
            </Popconfirm>
          </Permission>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen space-y-4 bg-slate-50 p-4">
      <Card bordered={false} className="shadow-sm">
        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-4">
          <Form.Item name="keyword" className="mb-0 min-w-[300px] flex-grow">
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索接口名称/路径"
              className="h-[44px] border-slate-300 font-bold"
            />
          </Form.Item>
          <Form.Item name="status" className="mb-0 min-w-[150px]">
            <Select
              placeholder="接口状态"
              className="h-[44px] font-bold"
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item className="mb-0 ml-auto">
            <Space size={8}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => filterForm.resetFields()}
                className="h-[44px] border-slate-500 font-bold text-slate-500"
              >
                重置
              </Button>
              <Permission code="system:api:create">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setOpen(true)}
                  className="h-[44px] border-none bg-slate-900 px-8 font-black hover:!bg-slate-800"
                >
                  新增接口
                </Button>
              </Permission>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} className="overflow-hidden rounded-xl shadow-sm">
        <BaseTable<ApiRecord> rowKey="id" columns={columns} dataSource={apis} loading={isLoading} />
      </Card>

      <Drawer
        title={
          <Space>
            <ThunderboltOutlined />
            <Text className="text-lg font-black">接口运行监控</Text>
          </Space>
        }
        width={600}
        onClose={() => {
          setStatsOpen(false);
          setActiveApiId(null);
        }}
        open={statsOpen}
        styles={{ header: { borderBottom: '1px solid #e2e8f0' } }}
      >
        {isStatsLoading ? (
          <Empty description="加载监控数据中..." />
        ) : apiStats ? (
          <div className="space-y-8">
            <div className="rounded-xl bg-slate-900 p-6 text-white shadow-xl">
              <Title level={5} className="!m-0 !mb-4 !text-xs uppercase tracking-widest !text-slate-400">
                Real-time Health Summary
              </Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title={<Text className="text-xs text-slate-400">最近一小时调用</Text>}
                    value={apiStats.summary.total}
                    valueStyle={{ color: '#fff', fontWeight: 900 }}
                    suffix="次"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<Text className="text-xs text-slate-400">成功率</Text>}
                    value={apiStats.summary.success_rate}
                    precision={1}
                    valueStyle={{
                      color: apiStats.summary.success_rate >= 95 ? '#10b981' : '#f43f5e',
                      fontWeight: 900,
                    }}
                    suffix="%"
                    prefix={
                      apiStats.summary.success_rate >= 95 ? <CheckCircleOutlined /> : <CloseCircleOutlined />
                    }
                  />
                </Col>
              </Row>
            </div>

            <div>
              <Divider orientation="left">
                <Text className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Traffic Trend (Last Hour)
                </Text>
              </Divider>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                {apiStats.timeline.length > 0 ? (
                  apiStats.timeline.map((point) => (
                    <div
                      key={point.time}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <Text className="font-mono text-xs text-slate-500">{point.time}</Text>
                      <Space size={16}>
                        <Text className="text-sm text-slate-700">总调用 {point.total}</Text>
                        <Text className="text-sm text-emerald-600">成功 {point.success}</Text>
                        <Text className="text-sm text-rose-600">失败 {point.failed}</Text>
                      </Space>
                    </div>
                  ))
                ) : (
                  <Empty description="暂无趋势数据" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <Empty description="暂无监控数据" />
        )}
      </Drawer>

      <BaseModal
        open={open}
        title={editing ? '编辑接口权限' : '新增接口权限'}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            editing
              ? updateMutation.mutate({ id: editing.id, payload: values })
              : createMutation.mutate(values)
          }
        >
          <Form.Item label={<Text className="font-bold">接口名称</Text>} name="api_name" rules={[{ required: true }]}>
            <Input className="h-[40px] font-bold" placeholder="如：获取用户信息" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label={<Text className="font-bold">请求方式</Text>}
                name="request_method"
                initialValue="GET"
                rules={[{ required: true }]}
              >
                <Select
                  className="h-[40px]"
                  options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((value) => ({
                    label: value,
                    value,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label={<Text className="font-bold">接口路径</Text>}
                name="api_path"
                rules={[{ required: true }]}
              >
                <Input className="h-[40px] font-mono" placeholder="/system/users" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<Text className="font-bold">关联角色 (逗号分隔)</Text>} name="role_ids">
            <Input className="h-[40px]" placeholder="role_admin, role_user" />
          </Form.Item>
          <Form.Item label={<Text className="font-bold">状态</Text>} name="status" initialValue={1}>
            <Select
              className="h-[40px]"
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
