import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Divider, Space, Typography, Drawer, Form, Input, InputNumber, Select, message } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { ApprovalNode, ApprovalTemplate } from '@/api/approval';
import { WorkflowNode } from './WorkflowNode';

const { Title, Text } = Typography;

interface WorkflowEditorProps {
  template: ApprovalTemplate | null;
  onSave: (nodes: ApprovalNode[]) => void;
  loading?: boolean;
}

export function WorkflowEditor({ template, onSave, loading }: WorkflowEditorProps) {
  const [nodes, setNodes] = useState<ApprovalNode[]>(template?.nodes || []);
  const [editingNode, setEditingNode] = useState<ApprovalNode | null>(null);
  const [form] = Form.useForm();

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // 禁止拖拽 start 和 end 节点
        if (items[oldIndex].type === 'start' || items[oldIndex].type === 'end') return items;
        if (items[newIndex].type === 'start' || items[newIndex].type === 'end') return items;

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addNode = (type: ApprovalNode['type']) => {
    const newNode: ApprovalNode = {
      id: `node-${Date.now()}`,
      name: type === 'approval' ? '新审批节点' : type === 'branch' ? '新分支节点' : '新抄送节点',
      type,
      timeoutHours: 24,
      approvers: [],
      copies: [],
    };
    
    // 插入到 end 节点之前
    const newNodes = [...nodes];
    const endIndex = newNodes.findIndex(n => n.type === 'end');
    if (endIndex !== -1) {
      newNodes.splice(endIndex, 0, newNode);
    } else {
      newNodes.push(newNode);
    }
    setNodes(newNodes);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  const saveNodeConfig = (values: any) => {
    if (!editingNode) return;
    setNodes(nodes.map(n => n.id === editingNode.id ? { ...n, ...values } : n));
    setEditingNode(null);
    message.success('节点配置已暂存');
  };

  return (
    <div className="flex flex-col items-center py-8 bg-slate-50 min-h-[600px] rounded-lg border-2 border-dashed border-slate-200">
      <div className="mb-8 flex justify-between w-full px-8">
        <div>
          <Title level={4} className="m-0 font-black text-slate-900">流程编排: {template?.name}</Title>
          <Text className="text-slate-500 italic">提示：拖拽卡片调整顺序，点击“设置”配置审批人</Text>
        </div>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={() => onSave(nodes)}
          loading={loading}
          className="font-bold h-[44px] px-8"
        >
          保存流程发布
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col items-center space-y-0">
            {nodes.map((node, index) => (
              <WorkflowNode 
                key={node.id} 
                node={node} 
                index={index} 
                isLocked={node.type === 'start' || node.type === 'end'}
                onEdit={setEditingNode}
                onDelete={deleteNode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 底部新增按钮组 */}
      <div className="mt-8">
        <div className="w-[2px] h-8 bg-slate-300 mx-auto mb-4" />
        <Space size={16}>
          <Button icon={<PlusOutlined />} className="font-bold border-blue-500 text-blue-600" onClick={() => addNode('approval')}>添加审批</Button>
          <Button icon={<PlusOutlined />} className="font-bold border-orange-500 text-orange-600" onClick={() => addNode('branch')}>添加分支</Button>
          <Button icon={<PlusOutlined />} className="font-bold border-green-500 text-green-600" onClick={() => addNode('copy')}>添加抄送</Button>
        </Space>
      </div>

      {/* 节点配置抽屉 */}
      <Drawer
        title={<Text className="font-black text-lg">配置节点: {editingNode?.name}</Text>}
        placement="right"
        width={400}
        onClose={() => setEditingNode(null)}
        open={!!editingNode}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="font-bold">确定</Button>
        }
      >
        {editingNode && (
          <Form 
            form={form} 
            layout="vertical" 
            initialValues={editingNode}
            onFinish={saveNodeConfig}
          >
            <Form.Item label={<Text className="font-bold">节点名称</Text>} name="name" rules={[{ required: true }]}>
              <Input className="font-bold text-slate-900" />
            </Form.Item>

            {editingNode.type === 'approval' && (
              <>
                <Form.Item label={<Text className="font-bold">审批限时 (小时)</Text>} name="timeoutHours">
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
                <Form.Item label={<Text className="font-bold">审批人</Text>} name="approvers">
                  <Select mode="multiple" placeholder="选择审批人员" options={[]} /> 
                </Form.Item>
              </>
            )}

            {editingNode.type === 'branch' && (
              <Form.Item label={<Text className="font-bold">分支条件</Text>} name="condition">
                <Input.TextArea rows={4} placeholder="例如：金额 > 5000" />
              </Form.Item>
            )}
          </Form>
        )}
      </Drawer>
    </div>
  );
}
