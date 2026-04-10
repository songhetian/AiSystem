import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Form, Input, Select, Space, Typography, Tag, Badge, Tooltip, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { approvalApi, type ApprovalTemplate } from '@/api/approval';
import { BaseTable } from '@/components/table/BaseTable';
import { ActionGroup } from '@/components/common/ActionGroup';
import { Permission } from '@/components/permission/Permission';
import { WorkflowEditor } from './components/WorkflowEditor';

const { Text } = Typography;

export default function ApprovalProcessPage() {
  const [filterForm] = Form.useForm();
  const [editingTemplate, setEditingTemplate] = useState<ApprovalTemplate | null>(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['approval-templates'],
    queryFn: approvalApi.listTemplates
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['approval-templates'] });

  const deleteMutation = useMutation({
    mutationFn: approvalApi.deleteTemplate,
    onSuccess: refresh
  });

  const saveMutation = useMutation({
    mutationFn: (nodes: any[]) => approvalApi.saveTemplate({ ...editingTemplate, nodes }),
    onSuccess: () => {
      message.success('流程已成功发布');
      setEditingTemplate(null);
      refresh();
    }
  });

  // 如果处于编辑模式，显示编辑器
  if (editingTemplate) {
    return (
      <div className="p-4">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => setEditingTemplate(null)}
          className="mb-4 font-bold"
        >
          返回模板列表
        </Button>
        <WorkflowEditor 
          template={editingTemplate} 
          onSave={(nodes) => saveMutation.mutate(nodes)}
          loading={saveMutation.isPending}
        />
      </div>
    );
  }

  const columns: ProColumns<ApprovalTemplate>[] = [
    {
      title: '模板名称',
      dataIndex: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text className="font-black text-slate-900">{text}</Text>
          <Text className="text-slate-500 text-xs">{record.description}</Text>
        </Space>
      )
    },
    {
      title: '审批类型',
      dataIndex: 'type',
      render: (type) => <Tag className="font-bold border-slate-300">{type}</Tag>
    },
    {
      title: '适用范围',
      dataIndex: 'platformName',
      render: (_, record) => (
        <div className="flex flex-col">
          <Text className="text-slate-600 text-xs">{record.platformName}</Text>
          <Text className="text-slate-900 font-bold">{record.departmentName}</Text>
        </div>
      )
    },
    {
      title: '流程节点',
      dataIndex: 'nodes',
      render: (_, record) => (
        <Space size={4}>
          {(record.nodes || []).map((node, idx) => (
            <span key={node.id} className="flex items-center">
              <Badge 
                count={idx + 1} 
                size="small" 
                style={{ backgroundColor: '#64748b', transform: 'scale(0.8)' }} 
              />
              <Text className="text-xs ml-1 font-bold text-slate-600">{node.name}</Text>
              {idx < record.nodes.length - 1 && <span className="mx-1 text-slate-300">→</span>}
            </span>
          ))}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'enabled' ? 'success' : 'default'} className="font-black border-2">
          {status === 'enabled' ? '启用中' : '已禁用'}
        </Tag>
      )
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <Permission code="approval:process:update">
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />} 
              className="font-bold text-slate-900"
              onClick={() => setEditingTemplate(record)}
            >
              配置流程
            </Button>
          </Permission>
          <ActionGroup
            onDelete={() => deleteMutation.mutate(record.id)}
            deletePermission="approval:process:delete"
          />
        </Space>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      {/* 搜索筛选区 - 单行全铺满自适应布局 */}
      <Card bordered={false} className="shadow-sm">
        <Form
          form={filterForm}
          layout="inline"
          className="flex flex-wrap items-center gap-4"
        >
          <Form.Item name="name" className="flex-grow min-w-[200px] mb-0">
            <Input prefix={<SearchOutlined />} placeholder="搜索模板名称" className="h-[44px]" />
          </Form.Item>
          <Form.Item name="type" className="flex-grow min-w-[150px] mb-0">
            <Select placeholder="审批类型" className="h-[44px]" options={[{ label: '请假', value: '请假' }, { label: '加班', value: '加班' }, { label: '报销', value: '报销' }]} allowClear />
          </Form.Item>
          <Form.Item name="status" className="min-w-[120px] mb-0">
            <Select placeholder="状态" className="h-[44px]" options={[{ label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }]} allowClear />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space size={8}>
              <Button icon={<ReloadOutlined />} onClick={() => filterForm.resetFields()} className="h-[44px] border-slate-500 font-bold">
                重置
              </Button>
              <Button type="primary" icon={<PlusOutlined />} className="h-[44px] font-bold">
                创建模板
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格区 */}
      <Card bordered={false} className="shadow-sm">
        <BaseTable<ApprovalTemplate>
          columns={columns}
          dataSource={templates}
          loading={isLoading}
          rowKey="id"
        />
      </Card>
    </div>
  );
}
