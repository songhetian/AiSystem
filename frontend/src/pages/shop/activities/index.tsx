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
  DatePicker,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface Activity {
  id: string;
  activity_name: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  status: number;
  description?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
}

export default function ActivityManagement() {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();

  // 模拟数据
  const [activities] = useState<Activity[]>([
    {
      id: "1",
      activity_name: "双十一大促",
      activity_type: "discount",
      start_time: "2026-11-01 00:00:00",
      end_time: "2026-11-11 23:59:59",
      status: 1,
      description: "全场8折优惠",
    },
    {
      id: "2",
      activity_name: "满减活动",
      activity_type: "fullcut",
      start_time: "2026-04-01 00:00:00",
      end_time: "2026-04-30 23:59:59",
      status: 1,
      description: "满100减20",
    },
  ]);

  const activityTypes = [
    { label: "折扣", value: "discount" },
    { label: "满减", value: "fullcut" },
    { label: "赠品", value: "gift" },
  ];

  const handleAdd = () => {
    setEditingActivity(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Activity) => {
    setEditingActivity(record);
    form.setFieldsValue({
      ...record,
      time_range: [dayjs(record.start_time), dayjs(record.end_time)],
    });
    setModalVisible(true);
  };

  const handleDelete = (record: Activity) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除活动"${record.activity_name}"吗？`,
      onOk: async () => {
        try {
          // TODO: 调用删除API
          message.success("删除成功");
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // TODO: 调用API保存
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success(editingActivity ? "更新成功" : "创建成功");
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "活动名称",
      dataIndex: "activity_name",
      key: "activity_name",
      width: 200,
    },
    {
      title: "活动类型",
      dataIndex: "activity_type",
      key: "activity_type",
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          discount: { label: "折扣", color: "blue" },
          fullcut: { label: "满减", color: "green" },
          gift: { label: "赠品", color: "orange" },
        };
        const config = typeMap[type] || { label: type, color: "default" };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "开始时间",
      dataIndex: "start_time",
      key: "start_time",
      width: 180,
    },
    {
      title: "结束时间",
      dataIndex: "end_time",
      key: "end_time",
      width: 180,
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
      width: 200,
      fixed: "right" as const,
      render: (_: any, record: Activity) => (
        <Space size="small">
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
            icon={<ThunderboltOutlined />}
            onClick={() => {
              // TODO: 跳转到规则配置页面
              message.info("规则配置功能开发中");
            }}
          >
            规则
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
    <div className="activity-management">
      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ fontSize: 20, color: "#f093fb" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>活动管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增活动
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={activities}
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
        title={editingActivity ? "编辑活动" : "新增活动"}
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
            label="活动名称"
            name="activity_name"
            rules={[{ required: true, message: "请输入活动名称" }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            label="活动类型"
            name="activity_type"
            rules={[{ required: true, message: "请选择活动类型" }]}
          >
            <Select placeholder="请选择活动类型" options={activityTypes} />
          </Form.Item>

          <Form.Item
            label="活动时间"
            name="time_range"
            rules={[{ required: true, message: "请选择活动时间" }]}
          >
            <RangePicker
              showTime
              style={{ width: "100%" }}
              placeholder={["开始时间", "结束时间"]}
            />
          </Form.Item>

          <Form.Item label="活动描述" name="description">
            <TextArea rows={4} placeholder="请输入活动描述" />
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
  );
}
