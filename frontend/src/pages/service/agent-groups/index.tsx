import { useState } from "react";
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const { TextArea } = Input;

interface AgentGroup {
  id: string;
  group_name: string;
  group_code: string;
  description?: string;
  status: number;
  member_count?: number;
  platform_id?: string;
  dept_id?: string;
}

export default function AgentGroupManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AgentGroup | null>(null);
  const [form] = Form.useForm();
  const { clearDraft } = useFormDraft(form, "service-agent-group-form");

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => handleAdd(),
    Escape: () => {
      setModalVisible(false);
      form.resetFields();
    },
  });

  // 模拟数据
  const [groups] = useState<AgentGroup[]>([
    {
      id: "1",
      group_name: "售前咨询组",
      group_code: "PRE_SALES",
      description: "负责售前咨询和产品介绍",
      status: 1,
      member_count: 8,
    },
    {
      id: "2",
      group_name: "售后服务组",
      group_code: "AFTER_SALES",
      description: "负责售后服务和问题处理",
      status: 1,
      member_count: 12,
    },
    {
      id: "3",
      group_name: "VIP客户组",
      group_code: "VIP_SERVICE",
      description: "专门服务VIP客户",
      status: 1,
      member_count: 5,
    },
  ]);

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: AgentGroup) => {
    setEditingGroup(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (record: AgentGroup) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除坐席组"${record.group_name}"吗？`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          // TODO: 调用删除API
          message.success("删除成功");
        } catch (error) {
          message.error("删除失败，请重试");
        }
      },
    });
  };

  const handleViewMembers = (record: AgentGroup) => {
    navigate(`/service/agent-groups/${record.id}`);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // TODO: 调用API保存
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success(editingGroup ? "更新成功" : "创建成功");
      setModalVisible(false);
      form.resetFields();
      clearDraft();
    } catch (error) {
      console.error("Submit error:", error);
      message.error(editingGroup ? "更新失败，请重试" : "创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "坐席组名称",
      dataIndex: "group_name",
      key: "group_name",
      width: 200,
    },
    {
      title: "坐席组编码",
      dataIndex: "group_code",
      key: "group_code",
      width: 150,
      render: (code: string) => (
        <code
          style={{
            padding: "2px 8px",
            background: "#f5f5f5",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {code}
        </code>
      ),
    },
    {
      title: "成员数量",
      dataIndex: "member_count",
      key: "member_count",
      width: 120,
      render: (count: number) => (
        <Space>
          <UserOutlined style={{ color: "#1890ff" }} />
          <span>{count || 0} 人</span>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number) => (
        <Tag color={status === 1 ? "green" : "default"}>
          {status === 1 ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 250,
      fixed: "right" as const,
      render: (_: any, record: AgentGroup) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => handleViewMembers(record)}
          >
            成员管理
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <GlobalLoading loading={loading}>
      <div className="agent-group-management">
        <Card
          title={
            <Space>
              <TeamOutlined style={{ fontSize: 20, color: "#4facfe" }} />
              <span style={{ fontSize: 18, fontWeight: 600 }}>坐席组管理</span>
            </Space>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增坐席组
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={groups}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Card>

        <Modal
          title={editingGroup ? "编辑坐席组" : "新增坐席组"}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
          }}
          confirmLoading={loading}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              status: 1,
            }}
          >
            <Form.Item
              label="坐席组名称"
              name="group_name"
              rules={[{ required: true, message: "请输入坐席组名称" }]}
            >
              <Input placeholder="请输入坐席组名称" />
            </Form.Item>

            <Form.Item
              label="坐席组编码"
              name="group_code"
              rules={[
                { required: true, message: "请输入坐席组编码" },
                {
                  pattern: /^[A-Z_]+$/,
                  message: "编码只能包含大写字母和下划线",
                },
              ]}
            >
              <Input
                placeholder="请输入坐席组编码（如：PRE_SALES）"
                disabled={!!editingGroup}
              />
            </Form.Item>

            <Form.Item label="描述" name="description">
              <TextArea rows={4} placeholder="请输入坐席组描述" />
            </Form.Item>

            <Form.Item label="状态" name="status">
              <Select
                options={[
                  { label: "启用", value: 1 },
                  { label: "禁用", value: 0 },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </GlobalLoading>
  );
}
