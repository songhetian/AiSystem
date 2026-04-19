import React, { useRef, useState } from "react";
import {
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
} from "antd";
import { BaseTable } from "@/components/table/BaseTable";
import { Permission } from "@/components/permission/Permission";
import { serviceApi } from "@/api/service";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { Text } = Typography;
const { TextArea } = Input;

export default function LossAnalysisPage() {
  const tableRef = useRef<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [currentRow, setCurrentRow] = useState<any>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => tableRef.current?.reload(),
    escape: () => {
      if (modalVisible) {
        setModalVisible(false);
      }
    },
  });

  const columns = [
    {
      title: "会话单号",
      dataIndex: "session_no",
      width: 180,
      render: (val: string) => (
        <Text className="text-slate-900 font-bold">{val}</Text>
      ),
    },
    {
      title: "流失风险信息",
      width: 250,
      render: (_: any, record: any) => (
        <div className="flex flex-col gap-1">
          <Text className="text-slate-900 font-bold">
            流失原因: {record.loss_reason || "-"}
          </Text>
          <Text className="text-slate-500 font-medium text-xs">
            商品: {record.product_name || "未关联"}
          </Text>
        </div>
      ),
    },
    {
      title: "当值客服",
      dataIndex: "agent_name",
      width: 120,
      render: (val: string) => (
        <Text className="text-slate-900 font-bold">{val || "-"}</Text>
      ),
    },
    {
      title: "挽回状态",
      dataIndex: "recovery_state",
      width: 120,
      render: (val: string) => {
        const stateMap: Record<string, { text: string; color: string }> = {
          pending: { text: "待处理", color: "error" },
          recovering: { text: "挽回中", color: "processing" },
          recovered: { text: "已挽回", color: "success" },
        };
        const st = stateMap[val] || stateMap.pending;
        return (
          <Tag color={st.color} className="font-bold">
            {st.text}
          </Tag>
        );
      },
    },
    {
      title: "挽回备注",
      dataIndex: "recovery_remark",
      render: (val: string) => (
        <Text
          className="text-slate-600 font-medium truncate max-w-[200px]"
          title={val}
        >
          {val || "-"}
        </Text>
      ),
    },
    {
      title: "生成时间",
      dataIndex: "create_time",
      width: 180,
      render: (val: string) => (
        <Text className="text-slate-500 font-bold">
          {new Date(val).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "操作",
      width: 120,
      fixed: "right",
      render: (_: any, record: any) => (
        <Permission code="service:loss:mark">
          <a
            className="text-indigo-600 hover:text-indigo-800 font-black"
            onClick={() => {
              setCurrentRow(record);
              form.setFieldsValue({
                recovery_state: record.recovery_state || "pending",
                recovery_remark: record.recovery_remark || "",
              });
              setModalVisible(true);
            }}
          >
            挽回跟进
          </a>
        </Permission>
      ),
    },
  ];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setGlobalLoading(true);
      setSaving(true);
      await serviceApi.updateLossRecovery(currentRow.id, values);
      message.success("流失跟进状态已更新");
      setModalVisible(false);
      tableRef.current?.reload();
    } catch (e: any) {
      if (e.errorFields) return;
      message.error(e.message || "更新失败");
    } finally {
      setSaving(false);
      setGlobalLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <GlobalLoading loading={globalLoading} />
      <BaseTable
        ref={tableRef}
        request={(params) => serviceApi.queryLossInquiries(params)}
        columns={columns}
        rowKey="id"
        searchRender={(formProps) => (
          <Form {...formProps} layout="inline" className="w-full flex">
            <Form.Item name="recovery_state" className="flex-grow">
              <Select placeholder="挽回状态" allowClear className="font-bold">
                <Select.Option value="pending">待处理</Select.Option>
                <Select.Option value="recovering">挽回中</Select.Option>
                <Select.Option value="recovered">已挽回</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="agent_name" className="flex-grow">
              <Input placeholder="输入客服名称筛选" className="font-bold" />
            </Form.Item>
            <Space className="ml-auto">
              <a
                className="ant-btn ant-btn-default font-bold text-slate-700 hover:text-slate-900 border-slate-300"
                onClick={() => formProps.form?.resetFields()}
              >
                重置
              </a>
              <a
                className="ant-btn ant-btn-primary font-black bg-slate-900"
                onClick={() => formProps.form?.submit()}
              >
                查询
              </a>
            </Space>
          </Form>
        )}
      />

      <Modal
        title={
          <span className="text-slate-900 font-black">流失挽回跟进记录</span>
        }
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnClose
        okButtonProps={{ className: "bg-slate-900 font-black text-white" }}
        cancelButtonProps={{ className: "font-bold text-slate-600" }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label={<Text className="text-slate-900 font-bold">跟进状态</Text>}
            name="recovery_state"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Select>
              <Select.Option value="pending">待处理</Select.Option>
              <Select.Option value="recovering">办理跟进中</Select.Option>
              <Select.Option value="recovered">已成功挽回下单</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={<Text className="text-slate-900 font-bold">处理备注</Text>}
            name="recovery_remark"
          >
            <TextArea
              rows={4}
              placeholder="记录客服致电或二次沟通的情况，方便复盘"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
