import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Button, 
  Card, 
  Form, 
  Input, 
  Popconfirm, 
  Select, 
  Space, 
  Typography, 
  Tag, 
  Drawer, 
  Statistic, 
  Row, 
  Col,
  Divider,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  PlusOutlined, 
  LineChartOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
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
}

export default function SystemApisPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRecord | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [activeApiId, setActiveApiId] = useState<string | null>(null);
  
  const [filterForm] = Form.useForm();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 1. 数据查询
  const { data: apis = [], isLoading } = useQuery<ApiRecord[]>({
    queryKey: ['system-apis'],
    queryFn: systemApi.listApis
  });

  const { data: apiStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['system-api-stats', activeApiId],
    queryFn: () => activeApiId ? systemApi.getApiStats(activeApiId) : null,
    enabled: !!activeApiId && statsOpen
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['system-apis'] });

  // 2. 变更操作
  const createMutation = useMutation({
    mutationFn: systemApi.createApi,
    onSuccess: () => { setOpen(false); form.resetFields(); refresh(); }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => systemApi.updateApi(id, payload),
    onSuccess: () => { setOpen(false); setEditing(null); form.resetFields(); refresh(); }
  });

  const deleteMutation = useMutation({
    mutationFn: systemApi.deleteApi,
    onSuccess: refresh
  });

  // 3. ECharts 配置
  const getOption = () => {
    if (!apiStats) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['调用总量', '成功次数'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: apiStats.timeline.map((t: any) => t.time) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '调用总量',
          type: 'line',
          smooth: true,
          data: apiStats.timeline.map((t: any) => t.total),
          itemStyle: { color: '#64748b' },
          areaStyle: { opacity: 0.1 }
        },
        {
          name: '成功次数',
          type: 'line',
          smooth: true,
          data: apiStats.timeline.map((t: any) => t.success),
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  };

  const columns: ProColumns<ApiRecord>[] = [
    {
      title: '接口名称',
      dataIndex: 'api_name',
      render: (t) => <Text className="font-black text-slate-900">{t}</Text>
    },
    {
      title: '请求方式',
      dataIndex: 'request_method',
      render: (m) => {
        const colors: any = { POST: 'blue', DELETE: 'red', PUT: 'orange', GET: 'green', PATCH: 'purple' };
        return <Tag color={colors[m]} className="font-black border-2">{m}</Tag>;
      }
    },
    {
      title: '接口路径',
      dataIndex: 'api_path',
      className: 'font-mono text-xs text-slate-500'
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 1 ? 'success' : 'default'} className="font-bold">{s === 1 ? '已启用' : '已禁用'}</Tag>
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
            onClick={() => { setActiveApiId(record.id); setStatsOpen(true); }}
          >
            健康度
          </Button>
          <Permission code="system:api:update">
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({
                  ...record,
                  role_ids: Array.isArray(record.role_ids) ? record.role_ids.join(', ') : ''
                });
                setOpen(true);
              }}
              className="font-bold"
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
      )
    }
  ];

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      {/* 搜索筛选区 - 雷犀 UI 标准布局 */}
      <Card bordered={false} className="shadow-sm">
        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-4">
          <Form.Item name="keyword" className="flex-grow min-w-[300px] mb-0">
            <Input prefix={<SearchOutlined />} placeholder="搜索接口名称/路径" className="h-[44px] font-bold border-slate-300" />
          </Form.Item>
          <Form.Item name="status" className="min-w-[150px] mb-0">
            <Select placeholder="接口状态" className="h-[44px] border-slate-500 font-bold" options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} allowClear />
          </Form.Item>
          <Form.Item className="mb-0 ml-auto">
            <Space size={8}>
              <Button icon={<ReloadOutlined />} onClick={() => filterForm.resetFields()} className="h-[44px] border-slate-500 font-bold text-slate-500">重置</Button>
              <Permission code="system:api:create">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} className="h-[44px] font-black px-8 bg-slate-900 border-none hover:!bg-slate-800">新增接口</Button>
              </Permission>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格区 */}
      <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden">
        <BaseTable<ApiRecord> rowKey="id" columns={columns} dataSource={apis} loading={isLoading} />
      </Card>

      {/* 监控详情抽屉 */}
      <Drawer
        title={<Space><ThunderboltOutlined /><Text className="font-black text-lg">接口运行监控</Text></Space>}
        width={600}
        onClose={() => { setStatsOpen(false); setActiveApiId(null); }}
        open={statsOpen}
        styles={{ header: { borderBottom: '1px solid #e2e8f0' } }}
      >
        {isStatsLoading ? <Empty description="加载监控数据中..." /> : apiStats ? (
          <div className="space-y-8">
            <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl">
              <Title level={5} className="!text-slate-400 !m-0 !mb-4 uppercase tracking-widest text-xs">Real-time Health Summary</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title={<Text className="text-slate-400 text-xs">最近一小时调用</Text>} 
                    value={apiStats.summary.total} 
                    valueStyle={{ color: '#fff', fontWeight: 900 }}
                    suffix="次"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title={<Text className="text-slate-400 text-xs">成功率</Text>} 
                    value={apiStats.summary.success_rate} 
                    precision={1}
                    valueStyle={{ color: apiStats.summary.success_rate >= 95 ? '#10b981' : '#f43f5e', fontWeight: 900 }}
                    suffix="%"
                    prefix={apiStats.summary.success_rate >= 95 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  />
                </Col>
              </Row>
            </div>

            <div>
              <Divider orientation="left"><Text className="font-black text-slate-600 uppercase tracking-widest text-xs">Traffic Trend (Last Hour)</Text></Divider>
              <div className="h-[300px] w-full">
                <ReactECharts option={getOption()} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <Text className="text-slate-500 text-xs italic">
                * 数据每 5 分钟自动聚合一次。预警阈值：成功率低于 95% 且调用量 {'>'} 5 次时将触发系统报警通知。
              </Text>
            </div>
          </div>
        ) : <Empty description="暂无监控数据" />}
      </Drawer>

      {/* 新增/编辑弹窗 */}
      <BaseModal
        open={open}
        title={editing ? '编辑接口权限' : '新增接口权限'}
        onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(v) => editing ? updateMutation.mutate({ id: editing.id, payload: v }) : createMutation.mutate(v)}>
          <Form.Item label={<Text className="font-bold">接口名称</Text>} name="api_name" rules={[{ required: true }]}><Input className="h-[40px] font-bold" placeholder="如：获取用户信息" /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item label={<Text className="font-bold">请求方式</Text>} name="request_method" initialValue="GET" rules={[{ required: true }]}><Select className="h-[40px]" options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(v => ({ label: v, value: v }))} /></Form.Item></Col>
            <Col span={16}><Form.Item label={<Text className="font-bold">接口路径</Text>} name="api_path" rules={[{ required: true }]}><Input className="h-[40px] font-mono" placeholder="/system/users" /></Form.Item></Col>
          </Row>
          <Form.Item label={<Text className="font-bold">关联角色 (逗号分隔)</Text>} name="role_ids"><Input className="h-[40px]" placeholder="role_admin, role_user" /></Form.Item>
          <Form.Item label={<Text className="font-bold">状态</Text>} name="status" initialValue={1}><Select className="h-[40px]" options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} /></Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
