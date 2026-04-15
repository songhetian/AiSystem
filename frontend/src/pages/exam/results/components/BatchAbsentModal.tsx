import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { examApi } from "@/api/exam";

const { Text } = Typography;
const { Dragger } = Upload;

interface BatchAbsentModalProps {
  open: boolean;
  planId: string;
  planName?: string;
  onClose: () => void;
}

export function BatchAbsentModal({
  open,
  planId,
  planName,
  onClose,
}: BatchAbsentModalProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [manualList, setManualList] = useState("");

  const mutation = useMutation({
    mutationFn: (items: Array<{ employee_no?: string; reason?: string }>) =>
      examApi.batchMarkAbsent(planId, items),
    onSuccess: (res: any) => {
      message.success(
        `批量标记完成：成功 ${res.success} 条，共 ${res.total} 条`,
      );
      queryClient.invalidateQueries({ queryKey: ["exam-results"] });
      queryClient.invalidateQueries({ queryKey: ["exam-results-summary"] });
      onClose();
      form.resetFields();
      setManualList("");
    },
    onError: () => message.error("批量标记失败，请重试"),
  });

  const handleOk = () => {
    const lines = manualList
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      message.warning("请输入至少一条缺考记录");
      return;
    }
    const items = lines.map((line) => {
      const [employee_no, reason] = line.split(",").map((s) => s.trim());
      return { employee_no, reason: reason || "管理员批量标记缺考" };
    });
    mutation.mutate(items);
  };

  return (
    <Modal
      open={open}
      title={`批量标记缺考 — ${planName ?? ""}`}
      onCancel={() => {
        onClose();
        form.resetFields();
        setManualList("");
      }}
      onOk={handleOk}
      confirmLoading={mutation.isPending}
      okText="确认标记"
      width={560}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Alert
          type="info"
          message="格式说明"
          description={
            <div>
              <Text>每行一条记录，格式：</Text>
              <Text code>工号,缺考原因（原因可选）</Text>
              <br />
              <Text type="secondary">示例：EMP001,请假未参加</Text>
            </div>
          }
          showIcon
        />

        <Form form={form} layout="vertical">
          <Form.Item label="批量输入（每行一条）">
            <Input.TextArea
              rows={8}
              placeholder={"EMP001,请假未参加\nEMP002,培训冲突\nEMP003"}
              value={manualList}
              onChange={(e) => setManualList(e.target.value)}
            />
          </Form.Item>
        </Form>

        <Text type="secondary" className="text-xs">
          共输入 {manualList.split("\n").filter((l) => l.trim()).length} 条记录
        </Text>
      </Space>
    </Modal>
  );
}
