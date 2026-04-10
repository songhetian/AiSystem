import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import type { ApprovalNode, ApprovalPerson, ApprovalTemplate } from '@/api/approval';
import { WorkflowNode } from './WorkflowNode';

const { Text, Title } = Typography;

interface WorkflowEditorProps {
  template: ApprovalTemplate | null;
  people: ApprovalPerson[];
  onSave: (nodes: ApprovalNode[]) => void;
  loading?: boolean;
}

export function WorkflowEditor({ template, people, onSave, loading }: WorkflowEditorProps) {
  const [nodes, setNodes] = useState<ApprovalNode[]>(template?.nodes || []);
  const [editingNode, setEditingNode] = useState<ApprovalNode | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    setNodes(template?.nodes || []);
  }, [template]);

  useEffect(() => {
    if (editingNode) {
      form.setFieldsValue({
        ...editingNode,
        approvers: editingNode.approvers?.map((item) => item.id) ?? [],
        copies: editingNode.copies?.map((item) => item.id) ?? [],
      });
    } else {
      form.resetFields();
    }
  }, [editingNode, form]);

  const sensors = useSensors(useSensor(PointerSensor));

  const personOptions = people.map((item) => ({
    label: `${item.name}${item.department ? ` / ${item.department}` : ''}`,
    value: item.id,
  }));

  const toPeople = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => people.find((item) => item.id === id))
      .filter((item): item is ApprovalPerson => Boolean(item));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setNodes((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return items;
      }

      if (items[oldIndex].type === 'start' || items[oldIndex].type === 'end') {
        return items;
      }

      if (items[newIndex].type === 'start' || items[newIndex].type === 'end') {
        return items;
      }

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const addNode = (type: ApprovalNode['type']) => {
    const nameMap: Record<'approval' | 'branch' | 'copy', string> = {
      approval: '新审批节点',
      branch: '新分支节点',
      copy: '新抄送节点',
    };

    const newNode: ApprovalNode = {
      id: `node-${Date.now()}`,
      name: nameMap[type as 'approval' | 'branch' | 'copy'],
      type,
      timeoutHours: 24,
      approvers: [],
      copies: [],
    };

    const nextNodes = [...nodes];
    const endIndex = nextNodes.findIndex((item) => item.type === 'end');
    if (endIndex >= 0) {
      nextNodes.splice(endIndex, 0, newNode);
    } else {
      nextNodes.push(newNode);
    }
    setNodes(nextNodes);
  };

  const deleteNode = (id: string) => {
    setNodes((items) => items.filter((item) => item.id !== id));
  };

  const saveNodeConfig = (values: any) => {
    if (!editingNode) {
      return;
    }

    const nextNode: ApprovalNode = {
      ...editingNode,
      ...values,
      approvers: toPeople(values.approvers),
      copies: toPeople(values.copies),
    };

    setNodes((items) => items.map((item) => (item.id === editingNode.id ? nextNode : item)));
    setEditingNode(null);
    message.success('节点配置已保存');
  };

  return (
    <div className="flex min-h-[600px] flex-col items-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8">
      <div className="mb-8 flex w-full justify-between px-8">
        <div>
          <Title level={4} className="m-0 font-black text-slate-900">
            流程编排: {template?.name}
          </Title>
          <Text className="text-slate-500">拖拽节点调整顺序，点击“配置”编辑审批人和规则。</Text>
        </div>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => onSave(nodes)} loading={loading} className="h-[44px] px-8 font-bold">
          保存流程
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={nodes.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col items-center">
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

      <div className="mt-8">
        <div className="mx-auto mb-4 h-8 w-[2px] bg-slate-300" />
        <Space size={16}>
          <Button icon={<PlusOutlined />} className="border-blue-500 font-bold text-blue-600" onClick={() => addNode('approval')}>
            添加审批
          </Button>
          <Button icon={<PlusOutlined />} className="border-orange-500 font-bold text-orange-600" onClick={() => addNode('branch')}>
            添加分支
          </Button>
          <Button icon={<PlusOutlined />} className="border-green-500 font-bold text-green-600" onClick={() => addNode('copy')}>
            添加抄送
          </Button>
        </Space>
      </div>

      <Drawer
        title={<Text className="text-lg font-black">配置节点: {editingNode?.name}</Text>}
        placement="right"
        width={420}
        onClose={() => setEditingNode(null)}
        open={Boolean(editingNode)}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="font-bold">
            确认
          </Button>
        }
      >
        {editingNode ? (
          <Form form={form} layout="vertical" onFinish={saveNodeConfig}>
            <Form.Item label={<Text className="font-bold">节点名称</Text>} name="name" rules={[{ required: true }]}>
              <Input className="font-bold text-slate-900" />
            </Form.Item>

            {editingNode.type === 'approval' ? (
              <>
                <Form.Item label={<Text className="font-bold">审批时限（小时）</Text>} name="timeoutHours">
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
                <Form.Item label={<Text className="font-bold">审批人</Text>} name="approvers" rules={[{ required: true, type: 'array', min: 1 }]}>
                  <Select mode="multiple" placeholder="选择审批人员" options={personOptions} optionFilterProp="label" />
                </Form.Item>
              </>
            ) : null}

            {editingNode.type === 'copy' ? (
              <Form.Item label={<Text className="font-bold">抄送人</Text>} name="copies">
                <Select mode="multiple" placeholder="选择抄送人员" options={personOptions} optionFilterProp="label" />
              </Form.Item>
            ) : null}

            {editingNode.type === 'branch' ? (
              <Form.Item label={<Text className="font-bold">分支条件</Text>} name="condition">
                <Input.TextArea rows={4} placeholder="例如：金额 > 5000" />
              </Form.Item>
            ) : null}
          </Form>
        ) : null}
      </Drawer>
    </div>
  );
}
