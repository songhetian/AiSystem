import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal, Select, message } from "antd";
import { BaseTable } from "@/components/table/BaseTable";
import { BaseModal } from "@/components/common/BaseModal";
import { financeApi, type ReimbursementRecord } from "@/api/finance";
import { getReimbursementColumns } from "./columns";

interface ReimbursementTableProps {
  keyword: string;
  status?: string;
}

export const ReimbursementTable = ({
  keyword,
  status,
}: ReimbursementTableProps) => {
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [current, setCurrent] = useState<ReimbursementRecord | null>(null);
  const [payForm] = Form.useForm();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-reimbursements"] });
    queryClient.invalidateQueries({ queryKey: ["finance-cash-recent"] });
  };

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => financeApi.withdrawReimbursement(id),
    onSuccess: () => {
      message.success("报销申请已撤回");
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "撤回失败"),
  });

  const payMutation = useMutation({
    mutationFn: (values: { pay_method: string; remark?: string }) =>
      financeApi.completePayment(current!.id, values),
    onSuccess: () => {
      message.success("打款成功，已自动同步支出记录");
      setPayOpen(false);
      payForm.resetFields();
      setCurrent(null);
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "打款失败"),
  });

  const handleWithdraw = (record: ReimbursementRecord) => {
    Modal.confirm({
      title: "确认撤回报销申请？",
      content: `撤回后，报销单「${record.reim_no}」将回到草稿状态，关联审批单也将同步撤回。`,
      okText: "确认撤回",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => withdrawMutation.mutateAsync(record.id),
    });
  };

  const handlePay = (record: ReimbursementRecord) => {
    setCurrent(record);
    setPayOpen(true);
  };

  const columns = getReimbursementColumns({
    onWithdraw: handleWithdraw,
    onPay: handlePay,
  });

  return (
    <>
      <BaseTable
        columns={columns}
        persistenceKey="finance:reimbursement"
        request={async (params: Record<string, any>) => {
          const res = await financeApi.listReimbursements({
            ...params,
            keyword,
            status,
          });
          return { data: res, success: true };
        }}
        scroll={{ y: 600 }}
      />

      {/* 打款弹窗 */}
      <BaseModal
        open={payOpen}
        title={`确认打款 — ${current?.reim_no}`}
        confirmLoading={payMutation.isPending}
        onCancel={() => {
          setPayOpen(false);
          payForm.resetFields();
          setCurrent(null);
        }}
        onOk={() => payForm.validateFields().then((v) => payMutation.mutate(v))}
      >
        <Form form={payForm} layout="vertical">
          <Form.Item label="报销金额">
            <span className="font-black text-red-600 text-lg">
              ￥{Number(current?.amount || 0).toLocaleString()}
            </span>
          </Form.Item>
          <Form.Item label="报销事由">
            <span className="text-slate-600">{current?.reason}</span>
          </Form.Item>
          <Form.Item
            label="打款方式"
            name="pay_method"
            rules={[{ required: true, message: "请选择打款方式" }]}
          >
            <Select
              options={[
                { label: "银行转账", value: "银行转账" },
                { label: "支付宝", value: "支付宝" },
                { label: "微信", value: "微信" },
                { label: "现金", value: "现金" },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="可选，填写打款备注" />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
};
