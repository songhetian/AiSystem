import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import { ProTable } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
  Modal,
  Select,
  Checkbox,
  Tooltip,
  Tabs,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  SendOutlined,
  BulbOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { systemApi } from "@/api/system";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  VariableSortList,
  type TemplateVariable,
} from "./components/VariableSortList";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * 通知模板管理页面 (PRD 2.1)
 * 特点：变量感知编辑、多渠道联动配置、实时发送预览
 */
export default function MessageTemplatesPage() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("list");
  const { clearDraft } = useFormDraft(form, "message-template-form");

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => handleEdit(),
    "Ctrl+r": () =>
      queryClient.invalidateQueries({ queryKey: ["message-templates"] }),
    Escape: () => setModalVisible(false),
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: () => systemApi.listMessageTemplates(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: systemApi.saveMessageTemplate,
    onSuccess: () => {
      message.success("模板保存成功");
      setModalVisible(false);
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    },
    onError: () => {
      message.error("模板保存失败，请重试");
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: systemApi.sendTestMessage,
    onSuccess: () => message.success("测试消息已发送至您的收件箱"),
    onError: () => message.error("测试消息发送失败，请重试"),
  });

  const handleEdit = (record?: any) => {
    if (record) {
      form.setFieldsValue({
        ...record,
        channels: record.channels?.split(",") || ["internal"],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 1, channels: ["internal"] });
    }
    setModalVisible(true);
  };

  const columns: ProColumns<any>[] = [
    {
      title: "模板名称",
      dataIndex: "name",
      className: "font-black text-slate-900",
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <Text className="font-black text-slate-900">{val}</Text>
          <Text className="text-[10px] text-slate-400 uppercase">
            {record.tpl_type}
          </Text>
        </Space>
      ),
    },
    {
      title: "分发渠道",
      dataIndex: "channels",
      render: (val: string) => (
        <Space>
          {val.split(",").map((c) => (
            <Tag
              key={c}
              color="blue"
              className="rounded-full font-bold border-none uppercase text-[10px]"
            >
              {c}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (val) =>
        val === 1 ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        ),
    },
    {
      title: "最后更新",
      dataIndex: "update_time",
      valueType: "dateTime",
      width: 180,
      className: "text-slate-400 font-medium",
    },
    {
      title: "操作",
      valueType: "option",
      width: 200,
      render: (_, record) => [
        <Button
          type="link"
          key="edit"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Button
          type="link"
          key="test"
          icon={<SendOutlined />}
          onClick={() => sendTestMutation.mutate({ templateName: record.name })}
        >
          测试
        </Button>,
        <Tooltip title="复制副本" key="copy">
          <Button
            type="text"
            icon={<CopyOutlined className="text-slate-400" />}
          />
        </Tooltip>,
      ],
    },
  ];

  // 模板变量配置（支持拖拽排序）
  const [templateVariables, setTemplateVariables] = useState<
    TemplateVariable[]
  >([
    {
      id: "1",
      label: "用户名称",
      value: "${username}",
      description: "接收通知的用户姓名",
      sort: 0,
    },
    {
      id: "2",
      label: "审批单号",
      value: "${requestId}",
      description: "审批流程的唯一标识",
      sort: 1,
    },
    {
      id: "3",
      label: "接口名称",
      value: "${apiName}",
      description: "监控接口的名称",
      sort: 2,
    },
    {
      id: "4",
      label: "异常详情",
      value: "${errorDetail}",
      description: "接口异常的详细信息",
      sort: 3,
    },
    {
      id: "5",
      label: "订单编号",
      value: "${orderNo}",
      description: "订单的唯一编号",
      sort: 4,
    },
    {
      id: "6",
      label: "店铺名称",
      value: "${shopName}",
      description: "关联店铺的名称",
      sort: 5,
    },
    {
      id: "7",
      label: "考勤日期",
      value: "${attendanceDate}",
      description: "考勤记录的日期",
      sort: 6,
    },
    {
      id: "8",
      label: "异常类型",
      value: "${exceptionType}",
      description: "异常的类型（迟到/早退/旷工）",
      sort: 7,
    },
  ]);

  const sortVariablesMutation = useMutation({
    mutationFn: async (variables: TemplateVariable[]) => {
      // 这里可以调用后端API保存变量排序
      // await systemApi.updateTemplateVariableSort(variables);
      // 目前先保存到本地状态
      return variables;
    },
    onSuccess: (variables) => {
      setTemplateVariables(variables);
      message.success("变量排序已保存");
    },
    onError: () => {
      message.error("变量排序保存失败");
    },
  });

  return (
    <GlobalLoading loading={isLoading}>
      <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <Space direction="vertical" size={0}>
            <Title
              level={3}
              className="!m-0 font-black text-slate-900 tracking-tight"
            >
              模板管理
            </Title>
            <Text className="text-slate-500 font-bold">
              配置多变量、多渠道的工业级通知模组 (PRD 2.1)
            </Text>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-slate-900 h-[44px] px-6 rounded-xl font-bold border-none"
            onClick={() => handleEdit()}
          >
            新增模板
          </Button>
        </div>

        <Card
          className="flex-1 rounded-2xl shadow-sm border-slate-100 overflow-hidden"
          bodyStyle={{ padding: 12 }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "list",
                label: (
                  <Space>
                    <span>模板列表</span>
                  </Space>
                ),
                children: (
                  <ProTable
                    columns={columns}
                    dataSource={templates}
                    isLoading={isLoading}
                    rowKey="id"
                    search={false}
                    options={{ density: false, setting: true }}
                    pagination={{ pageSize: 10 }}
                  />
                ),
              },
              {
                key: "variables",
                label: (
                  <Space>
                    <SortAscendingOutlined />
                    <span>变量排序</span>
                  </Space>
                ),
                children: (
                  <VariableSortList
                    variables={templateVariables}
                    onSave={(variables) =>
                      sortVariablesMutation.mutate(variables)
                    }
                    loading={sortVariablesMutation.isPending}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title={
            <Space>
              <BulbOutlined className="text-amber-500" />
              <Text className="font-black text-slate-900">配置通知模板</Text>
            </Space>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={800}
          confirmLoading={saveMutation.isPending}
          bodyStyle={{ padding: "24px 0" }}
          className="message-template-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) =>
              saveMutation.mutate({
                ...values,
                channels: values.channels.join(","),
              })
            }
            className="px-8"
          >
            <div className="grid grid-cols-2 gap-6">
              <Form.Item
                label="模板名称"
                name="name"
                rules={[{ required: true }]}
              >
                <Input
                  placeholder="输入唯一模板名称"
                  style={{ height: 44 }}
                  className="rounded-lg font-bold"
                />
              </Form.Item>
              <Form.Item
                label="业务类型"
                name="tpl_type"
                rules={[{ required: true }]}
              >
                <Select style={{ height: 44 }} className="font-bold">
                  <Select.Option value="approval">审批通知</Select.Option>
                  <Select.Option value="attendance">考勤通知</Select.Option>
                  <Select.Option value="business">业务通知</Select.Option>
                  <Select.Option value="interface">接口预警</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              label="通知方式 (多选)"
              name="channels"
              rules={[{ required: true }]}
            >
              <Checkbox.Group className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
                <Space size={32}>
                  <Checkbox value="internal">
                    <Text className="font-bold">站内信 (实时播报)</Text>
                  </Checkbox>
                  <Checkbox value="sms">
                    <Text className="font-bold">短信 (外部推送)</Text>
                  </Checkbox>
                  <Checkbox value="email">
                    <Text className="font-bold">邮件 (报表推送)</Text>
                  </Checkbox>
                </Space>
              </Checkbox.Group>
            </Form.Item>

            <Form.Item
              label="通知内容 (支持变量)"
              name="content"
              rules={[{ required: true }]}
            >
              <TextArea
                rows={5}
                placeholder="请输入模板内容，点击右侧变量快速插入..."
                className="rounded-xl border-slate-200 p-4 font-medium"
              />
            </Form.Item>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <Text className="text-[10px] text-slate-400 font-black uppercase mb-2 block">
                可用变量库（按排序显示）
              </Text>
              <Space wrap>
                {[...templateVariables]
                  .sort((a, b) => a.sort - b.sort)
                  .map((v) => (
                    <Tag
                      key={v.value}
                      className="cursor-pointer hover:border-blue-500 rounded-md py-1 px-3 bg-white border-slate-200 font-bold"
                      onClick={() => {
                        const cur = form.getFieldValue("content") || "";
                        form.setFieldsValue({ content: cur + v.value });
                      }}
                      title={v.description}
                    >
                      {v.label} {v.value}
                    </Tag>
                  ))}
              </Space>
            </div>
          </Form>
        </Modal>
      </div>
    </GlobalLoading>
  );
}
