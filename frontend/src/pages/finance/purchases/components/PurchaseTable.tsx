import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, InputNumber, Modal, message } from "antd";
import { BaseTable } from "@/components/table/BaseTable";
import { BaseModal } from "@/components/common/BaseModal";
import { financeApi, type PurchaseRecord } from "@/api/finance";
import { getPurchaseColumns } from "./columns";

interface PurchaseTableProps {
  keyword: string;
}

export const PurchaseTable = ({ keyword }: PurchaseTableProps) => {
  const queryClient = useQueryClient();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [current, setCurrent] = useState<PurchaseRecord | null>(null);
  const [completeForm] = Form.useForm();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-purchase-recent"] });
    queryClient.invalidateQueries({ queryKey: ["finance-purchases"] });
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.cancelPurchase(id, reason),
    onSuccess: () => {
      message.success("采购已成功取消");
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "操作失败"),
  });

  const completeMutation = useMutation({
    mutationFn: (values: { actual_amount: number; supplier_info: string }) =>
      financeApi.completePurchase(current!.id, values),
    onSuccess: () => {
      message.success("采购已完成，已自动同步支出记录");
      setCompleteOpen(false);
      completeForm.resetFields();
      setCurrent(null);
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "操作失败"),
  });

  const handleCancel = (record: PurchaseRecord) => {
    let reason = "";
    Modal.confirm({
      title: "确定要取消此项采购吗？",
      content: (
        <div className="mt-4">
          <Input.TextArea
            placeholder="请输入取消原因（必填）"
            onChange={(e) => {
              reason = e.target.value;
            }}
            rows={3}
          />
        </div>
      ),
      okText: "确认取消",
      okButtonProps: { danger: true, className: "font-bold" },
      cancelText: "返回",
      onOk: async () => {
        if (!reason.trim()) {
          message.error("请输入取消原因");
          return Promise.reject();
        }
        await cancelMutation.mutateAsync({ id: record.id, reason });
      },
    });
  };

  const handleComplete = (record: PurchaseRecord) => {
    setCurrent(record);
    completeForm.setFieldsValue({ actual_amount: Number(record.total_amount) });
    setCompleteOpen(true);
  };

  const columns = getPurchaseColumns({
    onCancel: handleCancel,
    onComplete: handleComplete,
  });

  return (
    <>
      <BaseTable
        columns={columns}
        persistenceKey="finance:purchases"
        request={async (params: Record<string, any>) => {
          const res = await financeApi.listPurchases({ ...params, keyword });
          return { data: res, success: true };
        }}
        scroll={{ y: 600 }}
      />

      {/* 标记完成弹窗 */}
      <BaseModal
        open={completeOpen}
        title={`标记采购完成 — ${current?.purchase_no}`}
        confirmLoading={completeMutation.isPending}
        onCancel={() => {
          setCompleteOpen(false);
          completeForm.resetFields();
          setCurrent(null);
        }}
        onOk={() =>
          completeForm.validateFields().then((v) => completeMutation.mutate(v))
        }
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item label="采购事由">
            <span className="text-slate-600">{current?.reason}</span>
          </Form.Item>
          <Form.Item label="预算金额">
            <span className="font-black text-slate-700">
              ￥{Number(current?.total_amount || 0).toLocaleString()}
            </span>
          </Form.Item>
          <Form.Item
            label="实际采购金额"
            name="actual_amount"
            rules={[
              { required: true, message: "请输入实际金额" },
              { type: "number", min: 0.01, message: "金额必须大于0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              prefix="￥"
              precision={2}
              min={0.01}
            />
          </Form.Item>
          <Form.Item
            label="供应商信息"
            name="supplier_info"
            rules={[{ required: true, message: "请填写供应商信息" }]}
          >
            <Input.TextArea rows={3} placeholder="填写供应商名称、联系方式等" />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
};
