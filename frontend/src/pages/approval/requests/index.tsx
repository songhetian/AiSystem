import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Typography, Tag, Tabs, message, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { approvalApi, type ApprovalRequest } from '@/api/approval';
import { BaseTable } from '@/components/table/BaseTable';
import { BaseModal } from '@/components/common/BaseModal';
import { LeixiLoading } from '@/components/common/LeixiLoading';

const { Text, Title } = Typography;

export default function ApprovalCenterPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [open, setOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [action, setAction] = useState<'approved' | 'rejected' | 'transferred'>('approved');
  const [form] = Form.useForm();
  
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['approval-requests', activeTab],
    queryFn: () => {
      if (activeTab === 'pending') return approvalApi.listPendingApprovals();
      if (activeTab === 'done') return approvalApi.listDoneApprovals();
      return approvalApi.listMyRequests();
    }
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approval-requests'] });

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
      title: '状态',
      dataIndex: 'status',
      render: (status) => {
        const config: any = {
          pending: { color: 'processing', text: '审批中', icon: <ReloadOutlined spin /> },
          approved: { color: 'success', text: '已通过', icon: <CheckCircleOutlined /> },
          rejected: { color: 'error', text: '已驳回', icon: <CloseCircleOutlined /> }
        };
        const item = config[status] || config.pending;
        return <Tag color={item.color} icon={item.icon} className="font-black border-2">{item.text}</Tag>;
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
          loading={{
            spinning: isLoading,
            indicator: <LeixiLoading tip="正在同步审批流水..." />
          }}
          rowKey="id"
        />
      </Card>

      <BaseModal
        open={open}
        title={<Title level={5} className="m-0 font-black">处理审批</Title>}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={actionMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => actionMutation.mutate({ id: selectedReq!.id, payload: { action, ...v } })}>
          <Form.Item label={<span className="font-bold text-slate-900">审批意见</span>} name="comment">
            <Input.TextArea rows={4} className="font-medium" />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}