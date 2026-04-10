import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Typography, Tag, Tabs, message, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SwapOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { approvalApi, type ApprovalRequest } from '@/api/approval';
import { BaseTable } from '@/components/table/BaseTable';
import { BaseModal } from '@/components/common/BaseModal';

const { Text, Title } = Typography;

export default function ApprovalCenterPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [open, setOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [action, setAction] = useState<'approved' | 'rejected' | 'transferred'>('approved');
  const [form] = Form.useForm();
  
  const queryClient = useQueryClient();

  // 1. 数据查询
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['approval-requests', activeTab],
    queryFn: () => {
      if (activeTab === 'pending') return approvalApi.listPendingApprovals();
      if (activeTab === 'done') return approvalApi.listDoneApprovals();
      return approvalApi.listMyRequests();
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approval-requests'] });

  // 2. 审批动作
  const actionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => approvalApi.takeAction(id, payload),
    onSuccess: () => {
      message.success('操作成功');
      setOpen(false);
      form.resetFields();
      refresh();
    }
  });

  const columns: ProColumns<ApprovalRequest>[] = [
    {
      title: '审批单信息',
      dataIndex: 'requestNo',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text className="font-black text-slate-900">{text}</Text>
          <Text className="text-slate-500 text-xs">{record.templateName}</Text>
        </Space>
      )
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      render: (text, record) => (
        <div className="flex flex-col">
          <Text className="text-slate-900 font-bold">{text}</Text>
          <Text className="text-slate-500 text-xs">{record.departmentName}</Text>
        </div>
      )
    },
    {
      title: '审批摘要',
      dataIndex: 'summary',
      render: (text) => <Text className="text-slate-600 max-w-[300px]" ellipsis>{text}</Text>
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (val) => val ? <Text className="font-black text-red-600">￥{Number(val).toFixed(2)}</Text> : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => {
        const config: any = {
          pending: { color: 'processing', text: '审批中', icon: <ReloadOutlined spin /> },
          approved: { color: 'success', text: '已通过', icon: <CheckCircleOutlined /> },
          rejected: { color: 'error', text: '已驳回', icon: <CloseCircleOutlined /> },
          transferred: { color: 'warning', text: '已转办', icon: <SwapOutlined /> }
        };
        const item = config[status] || config.pending;
        return <Tag color={item.color} icon={item.icon} className="font-black border-2">{item.text}</Tag>;
      }
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      className: 'text-slate-500 text-xs'
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => {
        if (activeTab !== 'pending') return <Button type="link" size="small">查看详情</Button>;
        return (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              className="bg-green-600 hover:bg-green-500 border-none font-bold"
              onClick={() => {
                setSelectedReq(record);
                setAction('approved');
                setOpen(true);
              }}
            >
              通过
            </Button>
            <Button 
              danger 
              size="small" 
              className="font-bold"
              onClick={() => {
                setSelectedReq(record);
                setAction('rejected');
                setOpen(true);
              }}
            >
              驳回
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="leixi-page-container">
      <Card bordered={false} styles={{ body: { padding: '16px 24px' } }} className="shadow-sm mb-4">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="font-black text-slate-900"
          size="large"
          items={[
            { key: 'pending', label: <Badge count={activeTab === 'pending' ? requests.length : 0} offset={[15, 0]}><span className="px-4">待我审批</span></Badge> },
            { key: 'done', label: <span className="px-4">已审批</span> },
            { key: 'my', label: <span className="px-4">我发起的</span> }
          ]}
        />
      </Card>

      <Card bordered={false} className="shadow-sm">
        <BaseTable<ApprovalRequest>
          columns={columns.map(col => ({
              ...col,
              className: col.className ? `${col.className} leixi-text-main` : 'leixi-text-main'
          }))}
          dataSource={requests}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      {/* 审批操作弹窗 */}
      <BaseModal
        open={open}
        title={
          <Space>
            <Title level={5} className="m-0 font-black">
              {action === 'approved' ? '通过审批' : '驳回申请'}
            </Title>
            <Text className="text-slate-400 font-normal">[{selectedReq?.requestNo}]</Text>
          </Space>
        }
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={actionMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => actionMutation.mutate({ id: selectedReq!.id, payload: { action, ...v } })}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
            <Text className="text-slate-500 block mb-1">申请人: <span className="text-slate-900 font-bold">{selectedReq?.applicantName}</span></Text>
            <Text className="text-slate-500 block">摘要: <span className="text-slate-900">{selectedReq?.summary}</span></Text>
          </div>
          
          <Form.Item label={<span className="font-bold text-slate-900">审批意见</span>} name="comment" rules={[{ required: action === 'rejected', message: '驳回必须填写意见' }]}>
            <Input.TextArea rows={4} placeholder={action === 'approved' ? '请输入审批意见(选填)' : '请输入驳回原因(必填)'} className="font-medium" />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
