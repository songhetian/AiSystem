import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { 
  Card, 
  Form, 
  Input, 
  Space, 
  Typography, 
  Tag, 
  DatePicker, 
  Drawer, 
  Divider, 
  Descriptions, 
  Tabs, 
  Button,
  Radio
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  HistoryOutlined, 
  EyeOutlined,
  ContainerOutlined,
  LoginOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { systemApi } from '@/api/system';
import { BaseTable } from '@/components/table/BaseTable';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type LogTab = 'operation' | 'login';

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<LogTab>('operation');
  const [detail, setDetail] = useState<any>(null);
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  // 1. 数据查询
  const { data: logData, isLoading, refetch } = useQuery({
    queryKey: ['system-logs', activeTab, pagination, filterForm.getFieldsValue()],
    queryFn: async () => {
      const values = filterForm.getFieldsValue();
      const params = {
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
        start_date: values.date?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        end_date: values.date?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };
      delete params.date;
      delete params.quickDate;

      if (activeTab === 'operation') {
        return systemApi.listOperationLogs(params);
      } else {
        return systemApi.listLoginLogs(params);
      }
    }
  });

  const handleQuickDate = (type: string) => {
    let range: [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    const now = dayjs();
    
    switch (type) {
      case 'today':
        range = [now.startOf('day'), now.endOf('day')];
        break;
      case 'yesterday':
        range = [now.subtract(1, 'day').startOf('day'), now.subtract(1, 'day').endOf('day')];
        break;
      case '7days':
        range = [now.subtract(6, 'days').startOf('day'), now.endOf('day')];
        break;
      case '30days':
        range = [now.subtract(29, 'days').startOf('day'), now.endOf('day')];
        break;
      default:
        range = undefined;
    }
    
    filterForm.setFieldsValue({ date: range });
    setPagination({ ...pagination, page: 1 });
    // Instant search linkage
  };

  const operationColumns: ProColumns<any>[] = [
    {
      title: '操作模块',
      dataIndex: 'operation_module',
      render: (t) => <Text className="font-black text-slate-900">{t || '系统模块'}</Text>
    },
    {
      title: '操作描述',
      dataIndex: 'api_name',
      render: (t) => <Text className="font-bold text-slate-700">{t}</Text>
    },
    {
      title: '请求方式',
      dataIndex: 'request_method',
      render: (m) => {
        const colors: any = { POST: 'blue', DELETE: 'red', PUT: 'orange', GET: 'green' };
        return <Tag color={colors[m]} className="font-black border-2">{m}</Tag>;
      }
    },
    {
      title: '操作人',
      dataIndex: 'username',
      render: (t) => <Text className="font-bold">{t}</Text>
    },
    {
      title: '请求IP',
      dataIndex: 'request_ip',
      className: 'text-slate-500 font-mono text-xs'
    },
    {
      title: '状态',
      dataIndex: 'operation_status',
      render: (s) => <Tag color={s === 1 ? 'success' : 'error'} className="font-bold">{s === 1 ? '成功' : '失败'}</Tag>
    },
    {
      title: '操作时间',
      dataIndex: 'create_time',
      valueType: 'dateTime',
      className: 'text-slate-500 text-xs'
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => setDetail(record)} className="font-bold text-blue-600 flex items-center">
          <EyeOutlined className="mr-1" />详情
        </a>
      )
    }
  ];

  const loginColumns: ProColumns<any>[] = [
    {
      title: '登录账号',
      dataIndex: 'username',
      render: (t) => <Text className="font-black text-slate-900">{t}</Text>
    },
    {
      title: '登录IP',
      dataIndex: 'login_ip',
      className: 'font-bold'
    },
    {
      title: '状态',
      dataIndex: 'login_status',
      render: (s) => <Tag color={s === 1 ? 'success' : 'error'} className="font-bold">{s === 1 ? '成功' : '失败'}</Tag>
    },
    {
      title: '提示消息',
      dataIndex: 'login_message',
      render: (t) => <Text className="text-slate-500 text-xs">{t || '-'}</Text>
    },
    {
      title: '用户代理',
      dataIndex: 'user_agent',
      className: 'text-slate-400 text-xs truncate max-w-[200px]'
    },
    {
      title: '登录时间',
      dataIndex: 'create_time',
      valueType: 'dateTime',
      className: 'text-slate-500 text-xs'
    }
  ];

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      <Card bordered={false} className="shadow-sm rounded-xl">
        <Tabs 
          activeKey={activeTab} 
          onChange={(k) => {
            setActiveTab(k as LogTab);
            setPagination({ page: 1, pageSize: 10 });
          }}
          items={[
            { key: 'operation', label: <Space><ContainerOutlined />操作审计</Space> },
            { key: 'login', label: <Space><LoginOutlined />登录日志</Space> },
          ]}
          className="mb-4"
        />

        <Form form={filterForm} layout="inline" className="flex flex-wrap items-center gap-y-4">
          <Form.Item name="keyword" className="flex-grow min-w-[300px] mb-0">
            <Input 
              prefix={<SearchOutlined />} 
              placeholder={activeTab === 'operation' ? "搜索操作描述/模块/用户名" : "搜索用户名/IP"} 
              className="h-[44px] font-bold border-slate-300" 
              onChange={() => setPagination({ ...pagination, page: 1 })}
            />
          </Form.Item>
          
          <div className="flex items-center ml-auto gap-2">
            <Form.Item name="quickDate" className="mb-0">
              <Radio.Group 
                className="flex"
                onChange={(e) => handleQuickDate(e.target.value)}
              >
                <Radio.Button value="today" className="h-[44px] leading-[42px] border-slate-500 font-bold px-4">今天</Radio.Button>
                <Radio.Button value="yesterday" className="h-[44px] leading-[42px] border-slate-500 font-bold px-4">昨天</Radio.Button>
                <Radio.Button value="7days" className="h-[44px] leading-[42px] border-slate-500 font-bold px-4">近7天</Radio.Button>
                <Radio.Button value="30days" className="h-[44px] leading-[42px] border-slate-500 font-bold px-4">近30天</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="date" className="mb-0">
              <RangePicker 
                className="h-[44px] border-slate-500 font-bold" 
                onChange={() => setPagination({ ...pagination, page: 1 })}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Space size={8}>
                <Button 
                  icon={<ReloadOutlined />} 
                  className="h-[44px] border-slate-300 font-bold text-slate-500"
                  onClick={() => {
                    filterForm.resetFields();
                    setPagination({ page: 1, pageSize: 10 });
                  }}
                >
                  重置
                </Button>
                <Button 
                  type="primary" 
                  className="h-[44px] font-black px-8 bg-slate-900 border-none hover:!bg-slate-800"
                  onClick={() => refetch()}
                >
                  立即查询
                </Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden">
        <BaseTable
          columns={activeTab === 'operation' ? operationColumns : loginColumns}
          dataSource={logData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: logData?.total || 0,
            onChange: (page, pageSize) => setPagination({ page, pageSize }),
            showSizeChanger: true,
            className: 'pr-4 pb-4'
          }}
        />
      </Card>

      {/* 日志详情抽屉 */}
      <Drawer
        title={<Space><HistoryOutlined /><Text className="font-black text-lg">操作审计详情</Text></Space>}
        width={700}
        onClose={() => setDetail(null)}
        open={!!detail}
        styles={{ header: { borderBottom: '1px solid #e2e8f0' } }}
      >
        {detail && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <Descriptions 
                title={<Text className="font-black text-slate-900 border-l-4 border-slate-900 pl-3">基础运行信息</Text>} 
                column={1} 
                size="small"
              >
                <Descriptions.Item label={<Text className="font-bold text-slate-500">API 路径</Text>}>
                  <Text className="font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200">{detail.api_path}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text className="font-bold text-slate-500">请求方法</Text>}>
                  <Tag className="font-black px-3">{detail.request_method}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<Text className="font-bold text-slate-500">用户代理</Text>}>
                  <Text className="text-slate-600 text-xs italic">{detail.user_agent}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="space-y-4">
              <Divider orientation="left">
                <Text className="font-black text-slate-600 uppercase tracking-widest text-xs">Request Parameters</Text>
              </Divider>
              <div className="bg-slate-900 p-4 rounded-xl shadow-inner overflow-auto max-h-[300px]">
                <pre className="text-emerald-400 text-xs m-0 font-mono leading-relaxed">
                  {JSON.stringify(detail.request_params || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-4">
              <Divider orientation="left">
                <Text className="font-black text-slate-600 uppercase tracking-widest text-xs">Response Data</Text>
              </Divider>
              <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300">
                <Text className="text-slate-900 font-bold block mb-2">业务摘要：</Text>
                <Text className="text-slate-600 italic">
                  {detail.operation_message || '接口执行完毕，无特殊响应说明'}
                </Text>
                {detail.response_summary && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <pre className="text-xs text-slate-500 overflow-auto">
                      {JSON.stringify(detail.response_summary, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
