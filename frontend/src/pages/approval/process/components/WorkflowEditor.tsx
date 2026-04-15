import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Badge,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import type {
  ApprovalNode,
  ApprovalPerson,
  ApprovalTemplate,
} from "@/api/approval";
import { WorkflowNode } from "./WorkflowNode";
import { ApproverDragSelector } from "./ApproverDragSelector";

const { Text, Title } = Typography;

interface WorkflowEditorProps {
  template: ApprovalTemplate | null;
  people: ApprovalPerson[];
  onSave: (nodes: ApprovalNode[], formFields: any[]) => void;
  loading?: boolean;
}

export function WorkflowEditor({
  template,
  people,
  onSave,
  loading,
}: WorkflowEditorProps) {
  const [nodes, setNodes] = useState<ApprovalNode[]>(template?.nodes || []);
  const [formFields, setFormFields] = useState<any[]>(
    template?.formFields || [],
  );
  const [activeTab, setActiveTab] = useState<"workflow" | "form">("workflow");
  const [editingNode, setEditingNode] = useState<ApprovalNode | null>(null);
  const [form] = Form.useForm();
  const [fieldForm] = Form.useForm();

  useEffect(() => {
    setNodes(template?.nodes || []);
    setFormFields(template?.formFields || []);
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
    label: `${item.name}${item.department ? ` / ${item.department}` : ""}`,
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

      if (items[oldIndex].type === "start" || items[oldIndex].type === "end") {
        return items;
      }

      if (items[newIndex].type === "start" || items[newIndex].type === "end") {
        return items;
      }

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const addNode = (type: ApprovalNode["type"]) => {
    const nameMap: Record<"approval" | "branch" | "copy", string> = {
      approval: "新审批节点",
      branch: "新分支节点",
      copy: "新抄送节点",
    };

    const newNode: ApprovalNode = {
      id: `node-${Date.now()}`,
      name: nameMap[type as "approval" | "branch" | "copy"],
      type,
      timeoutHours: 24,
      mode: "or",
      approvers: [],
      copies: [],
    };

    const nextNodes = [...nodes];
    const endIndex = nextNodes.findIndex((item) => item.type === "end");
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

    setNodes((items) =>
      items.map((item) => (item.id === editingNode.id ? nextNode : item)),
    );
    setEditingNode(null);
    message.success("节点配置已保存");
  };

  return (
    <div className="flex min-h-[700px] flex-col rounded-lg border-2 border-slate-200 bg-white">
      <div className="flex w-full items-center justify-between border-b bg-slate-50 px-8 py-4 gap-4">
        <div className="flex-grow">
          <Title level={4} className="m-0 font-black text-slate-900">
            {template?.name} - 设计中心
          </Title>
          <Text className="text-slate-500">编排审批流转路径与业务表单字段</Text>
        </div>
        <div className="flex items-center gap-6">
          <Tabs
            activeKey={activeTab}
            onChange={(k: any) => setActiveTab(k)}
            style={{ marginBottom: -17 }}
            items={[
              {
                label: <span className="font-bold px-4">流程编排</span>,
                key: "workflow",
              },
              {
                label: <span className="font-bold px-4">表单设计</span>,
                key: "form",
              },
            ]}
          />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => onSave(nodes, formFields)}
            loading={loading}
            className="h-[44px] px-8 font-bold"
          >
            发布模板
          </Button>
        </div>
      </div>

      <div className="flex-grow p-8">
        {activeTab === "workflow" ? (
          <div className="flex flex-col items-center">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={nodes.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col items-center">
                  {nodes.map((node, index) => (
                    <WorkflowNode
                      key={node.id}
                      node={node}
                      index={index}
                      isLocked={node.type === "start" || node.type === "end"}
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
                <Button
                  icon={<PlusOutlined />}
                  className="border-slate-900 font-bold text-slate-900 h-[44px]"
                  onClick={() => addNode("approval")}
                >
                  添加审批
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  className="border-orange-500 font-bold text-orange-600 h-[44px]"
                  onClick={() => addNode("branch")}
                >
                  添加分支
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  className="border-green-500 font-bold text-green-600 h-[44px]"
                  onClick={() => addNode("copy")}
                >
                  添加抄送
                </Button>
              </Space>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <Title level={5} className="leixi-text-main m-0">
                业务表单字段 (用于申请人填写)
              </Title>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setFormFields([
                    ...formFields,
                    {
                      label: "新字段",
                      key: `field_${Date.now()}`,
                      type: "text",
                      required: true,
                    },
                  ]);
                }}
              >
                新增字段
              </Button>
            </div>

            <div className="space-y-4">
              {formFields.map((field, idx) => (
                <Card
                  key={idx}
                  className="shadow-sm leixi-filter-border"
                  size="small"
                >
                  <div className="flex justify-between items-center">
                    <Space size={16}>
                      <Tag color="blue" className="font-bold uppercase">
                        {field.type}
                      </Tag>
                      <Text className="leixi-text-main text-lg">
                        {field.label}
                      </Text>
                      {field.required && <Badge status="error" text="必填" />}
                      <Text className="text-slate-500 font-mono text-xs">
                        [{field.key}]
                      </Text>
                    </Space>
                    <Button
                      danger
                      type="link"
                      className="font-bold"
                      onClick={() =>
                        setFormFields((f) => f.filter((_, i) => i !== idx))
                      }
                    >
                      移除
                    </Button>
                  </div>
                </Card>
              ))}
              {formFields.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded border-2 border-dashed border-slate-200">
                  <Text className="text-slate-500">还未添加任何自定义字段</Text>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Drawer
        title={
          <Text className="text-lg font-black">
            配置节点: {editingNode?.name}
          </Text>
        }
        placement="right"
        width={420}
        onClose={() => setEditingNode(null)}
        open={Boolean(editingNode)}
        extra={
          <Button
            type="primary"
            onClick={() => form.submit()}
            className="font-bold"
          >
            确认
          </Button>
        }
      >
        {editingNode ? (
          <Form form={form} layout="vertical" onFinish={saveNodeConfig}>
            <Form.Item
              label={<Text className="font-bold">节点名称</Text>}
              name="name"
              rules={[{ required: true }]}
            >
              <Input className="font-bold text-slate-900" />
            </Form.Item>

            {editingNode.type === "approval" ? (
              <>
                <Form.Item
                  label={<Text className="font-bold">审批时限（小时）</Text>}
                  name="timeoutHours"
                >
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
                <Form.Item
                  label={<Text className="font-bold">审批方式</Text>}
                  name="mode"
                  initialValue="or"
                >
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="or">或签 (任意一人)</Radio.Button>
                    <Radio.Button value="and">会签 (全部通过)</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  label={<Text className="font-bold">审批人</Text>}
                  name="approvers"
                  rules={[{ required: true, type: "array", min: 1 }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择审批人员"
                    options={personOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>
              </>
            ) : null}

            {editingNode.type === "copy" ? (
              <Form.Item
                label={<Text className="font-bold">抄送人</Text>}
                name="copies"
              >
                <Select
                  mode="multiple"
                  placeholder="选择抄送人员"
                  options={personOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            ) : null}

            {editingNode.type === "branch" ? (
              <Form.Item
                label={<Text className="font-bold">分支条件</Text>}
                name="condition"
              >
                <Input.TextArea rows={4} placeholder="例如：金额 > 5000" />
              </Form.Item>
            ) : null}
          </Form>
        ) : null}
      </Drawer>
    </div>
  );
}
