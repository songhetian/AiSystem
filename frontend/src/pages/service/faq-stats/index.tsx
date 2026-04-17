import React, { useRef, useState } from "react";
import {
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Button,
  Segmented,
  message,
} from "antd";
import { BaseTable } from "@/components/BaseTable";
import { Permission } from "@/components/Permission";
import { serviceApi } from "@/api/service";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GlobalLoading from "@/components/common/GlobalLoading";

const { Text, Title } = Typography;

export default function FaqStatsPage() {
  const tableRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<string>("general");
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
      title: "高频问题原声聚合",
      dataIndex: "faq_content",
      width: 400,
      render: (val: string) => (
        <Text className="text-slate-900 font-bold">{val}</Text>
      ),
    },
    {
      title: "累计触发频次",
      dataIndex: "hit_count",
      width: 150,
      render: (val: number) => (
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded font-black">
          {val} 次
        </span>
      ),
    },
    {
      title: "已关联话术ID",
      dataIndex: "article_id",
      width: 200,
      render: (val: string) => (
        <Text className="text-emerald-700 font-bold">
          {val || "尚未配置自动回复标准话术"}
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
      title: "管理操作",
      width: 150,
      fixed: "right",
      render: (_: any, record: any) => (
        <Permission button_code="service:faq:map">
          <a
            className="text-indigo-600 hover:text-indigo-800 font-black"
            onClick={() => {
              setCurrentRow(record);
              form.setFieldsValue({
                article_id: record.article_id || "",
              });
              setModalVisible(true);
            }}
          >
            映射标准话术
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
      await serviceApi.mapFaqArticle({
        faq_content: currentRow.faq_content,
        article_id: values.article_id,
        faq_type: currentRow.faq_type,
        product_id: currentRow.product_id,
      });
      message.success("已成功更新并关联知识库话术");
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
      <div className="bg-white px-4 py-3 rounded-t-lg border-b border-slate-200">
        <div className="flex justify-between items-center">
          <Title level={5} className="!m-0 text-slate-900 font-black">
            AI 高频咨询雷达
          </Title>
          <Segmented
            options={[
              {
                label: <span className="font-bold px-4">全平台统管</span>,
                value: "general",
              },
              {
                label: <span className="font-bold px-4">单商品提纯</span>,
                value: "product",
              },
            ]}
            value={activeTab}
            onChange={(v) => {
              setActiveTab(v as string);
              setTimeout(() => tableRef.current?.reload(), 0);
            }}
            className="bg-slate-100 p-1"
          />
        </div>
      </div>
      <BaseTable
        ref={tableRef}
        request={(params) =>
          serviceApi.queryFaqStats({ ...params, faq_type: activeTab })
        }
        columns={columns}
        rowKey="id"
        hideSearch
        className="rounded-t-none border-t-0"
      />

      <Modal
        title={
          <span className="text-slate-900 font-black">绑定自动回复话术</span>
        }
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnClose
        okButtonProps={{ className: "bg-slate-900 font-black text-white" }}
        cancelButtonProps={{ className: "font-bold text-slate-600" }}
      >
        <div className="bg-slate-50 p-4 rounded mb-6 border border-slate-200">
          <Text className="text-slate-600 block mb-2">高频原声：</Text>
          <Text className="text-slate-900 font-black text-lg">
            {currentRow?.faq_content}
          </Text>
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            label={
              <Text className="text-slate-900 font-bold">关联知识库文章ID</Text>
            }
            name="article_id"
            rules={[{ required: true, message: "请输入文章引擎ID" }]}
          >
            <Input
              placeholder="输入知识库的 Article ID 用于自动反向回复"
              size="large"
              className="font-bold text-slate-900"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
