import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Tabs,
  message,
  Badge,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  approvalApi,
  type ApprovalRequest,
  type ApprovalPerson,
} from "@/api/approval";
import { BaseTable } from "@/components/table/BaseTable";
import { BaseModal } from "@/components/common/BaseModal";
import { downloadCSV } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import {
  confirmBatchAction,
  handleExportWithProgress,
} from "@/utils/ui-helpers";

const { Text } = Typography;

type ActionType = "approved" | "rejected" | "transferred";

const STATUS_CONFIG: Record<
  string,
  { color: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    color: "processing",
    text: "审批中",
    icon: <ReloadOutlined spin />,
  },
  approved: { color: "success", text: "已通过", icon: <CheckCircleOutlined /> },
  rejected: { color: "error", text: "已驳回", icon: <CloseCircleOutlined /> },
  withdrawn: { color: "default", text: "已撤回", icon: null },
};

export default function ApprovalCenterPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<ActionType>("approved");
  const [batchAction, setBatchAction] = useState<"approved" | "rejected">(
    "approved",
  );
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-requests", activeTab],
    queryFn: () => {
      if (activeTab === "pending") return approvalApi.listPendingApprovals();
      if (activeTab === "done") return approvalApi.listDoneApprovals();
      return approvalApi.listMyRequests();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["approval-stats"],
    queryFn: approvalApi.requestStats,
  });

  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ["approval-people"],
    queryFn: approvalApi.listPeople,
    enabled: open && action === "transferred",
  });

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
      setBatchOpen(false);
    },
  });

  const refresh = () => {
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
  };

  const actionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => {
      if (payload.action === "approved")
        return approvalApi.approveRequest(id, { comment: payload.comment });
      if (payload.action === "rejected")
        return approvalApi.rejectRequest(id, { comment: payload.comment });
      return approvalApi.transferRequest(id, {
        comment: payload.comment,
        assigneeId: payload.target_user_id,
      });
    },
    onSuccess: () => {
      message.success("操作成功");
      setOpen(false);
      form.resetFields();
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "操作失败"),
  });

  const batchActionMutation = useMutation({
    mutationFn: (payload: {
      action: "approved" | "rejected";
      comment?: string;
    }) => {
      if (payload.action === "approved") {
        return approvalApi.batchApprove({
          ids: selectedIds,
          comment: payload.comment,
        });
      }
      return approvalApi.batchReject({
        ids: selectedIds,
        comment: payload.comment,
      });
    },
    onSuccess: (_, variables) => {
      message.success(
        `批量${variables.action === "approved" ? "同意" : "驳回"}成功`,
      );
      setBatchOpen(false);
      batchForm.resetFields();
      refresh();
    },
    onError: (e: any) =>
      message.error(e?.response?.data?.message || "批量操作失败"),
  });

  const openAction = (record: ApprovalRequest, act: ActionType) => {
    setSelectedReq(record);
    setAction(act);
    setOpen(true);
  };

  const openBatchAction = (act: "approved" | "rejected") => {
    if (selectedIds.length === 0) {
      message.warning("请先选择要操作的审批单");
      return;
    }
    confirmBatchAction(
      selectedIds.length,
      act === "approved" ? "同意" : "驳回",
      async () => {
        setBatchAction(act);
        setBatchOpen(true);
      },
    );
  };

  const handleExport = () => {
    handleExportWithProgress(async () => {
      downloadCSV(requests, `审批记录_${dayjs().format("YYYYMMDD")}`, [
        { label: "审批单号", key: "requestNo" },
        { label: "模板名称", key: "templateName" },
        { label: "申请人", key: "applicantName" },
        { label: "状态", key: "status" },
        { label: "摘要", key: "summary" },
        { label: "发起时间", key: "createdAt" },
      ]);
    });
  };

  const columns: ProColumns<ApprovalRequest>[] = [
    {
      title: "审批单信息",
      dataIndex: "requestNo",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text className="font-black text-slate-900">{record.requestNo}</Text>
          <Text className="text-slate-500 text-xs">{record.templateName}</Text>
          {record.summary && (
            <Text
              className="text-slate-400 text-xs"
              ellipsis
              style={{ maxWidth: 260 }}
            >
              {record.summary}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "申请人",
      dataIndex: "applicantName",
      width: 100,
      render: (_: any, record: ApprovalRequest) => <Text className="text-slate-700 font-bold">{record.applicantName}</Text>,
    },
    {
      title: "金额",
      dataIndex: "amount",
      width: 110,
      render: (_: any, record: ApprovalRequest) =>
        record.amount ? (
          <Text className="font-black text-red-600">
            ￥{Number(record.amount).toLocaleString()}
          </Text>
        ) : (
          <Text className="text-slate-400">—</Text>
        ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (_, record) => {
        const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
        return (
          <Tag
            color={cfg.color}
            icon={cfg.icon}
            className="font-black border-2"
          >
            {cfg.text}
          </Tag>
        );
      },
    },
    {
      title: "当前审批人",
      dataIndex: "currentApproverName",
      width: 110,
      render: (_: any, record: ApprovalRequest) =>
        record.currentApproverName ? (
          <Text className="text-slate-600">{record.currentApproverName}</Text>
        ) : (
          <Text className="text-slate-400">—</Text>
        ),
    },
    {
      title: "发起时间",
      dataIndex: "createdAt",
      width: 150,
      render: (_: any, record: ApprovalRequest) => (
        <Text className="text-slate-400 text-xs">
          {dayjs(record.createdAt).format("YYYY-MM-DD HH:mm")}
        </Text>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      width: 180,
      render: (_, record) => {
        if (activeTab !== "pending") return null;
        return (
          <Space size={6}>
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => openAction(record, "approved")}
            >
              同意
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => openAction(record, "rejected")}
            >
              驳回
            </Button>
            <Tooltip title="转审">
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() => openAction(record, "transferred")}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="leixi-page-container">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          {
            label: "待我审批",
            value: stats?.pending ?? 0,
            color: "text-orange-500",
          },
          {
            label: "我发起的",
            value: stats?.mine ?? 0,
            color: "text-blue-600",
          },
          {
            label: "已处理",
            value: stats?.processed ?? 0,
            color: "text-green-600",
          },
        ].map((item) => (
          <Card key={item.label} size="small" className="shadow-sm text-center">
            <div className={`text-3xl font-black ${item.color}`}>
              {item.value}
            </div>
            <div className="text-slate-500 text-sm mt-1">{item.label}</div>
          </Card>
        ))}
      </div>

      <Card
        bordered={false}
        styles={{ body: { padding: "0 24px" } }}
        className="shadow-sm mb-4"
        extra={
          <Space>
            {activeTab === "pending" && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  disabled={selectedIds.length === 0}
                  onClick={() => openBatchAction("approved")}
                  className="font-bold"
                >
                  批量同意 {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  disabled={selectedIds.length === 0}
                  onClick={() => openBatchAction("rejected")}
                  className="font-bold"
                >
                  批量驳回 {selectedIds.length > 0 && `(${selectedIds.length})`}
                </Button>
              </>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              className="font-bold"
            >
              导出记录
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="font-black text-slate-900"
          size="large"
          items={[
            {
              key: "pending",
              label: (
                <Badge count={stats?.pending ?? 0} offset={[12, 0]}>
                  <span className="px-2">待我审批</span>
                </Badge>
              ),
            },
            { key: "done", label: <span className="px-2">已审批</span> },
            { key: "my", label: <span className="px-2">我发起的</span> },
          ]}
        />
      </Card>

      <Card bordered={false} className="shadow-sm">
        <GlobalLoading loading={isLoading}>
          <BaseTable<ApprovalRequest>
            columns={columns}
            dataSource={requests}
            loading={isLoading}
            rowKey="id"
            rowSelection={
              activeTab === "pending"
                ? {
                    selectedRowKeys: selectedIds,
                    onChange: (keys: React.Key[]) =>
                      setSelectedIds(keys as string[]),
                  }
                : undefined
            }
          />
        </GlobalLoading>
      </Card>

      {/* 操作弹窗 */}
      <BaseModal
        open={open}
        title={
          action === "approved"
            ? "✅ 同意审批"
            : action === "rejected"
              ? "❌ 驳回审批"
              : "🔄 转审"
        }
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={() =>
          form.validateFields().then((v) =>
            actionMutation.mutate({
              id: selectedReq!.id,
              payload: { action, ...v },
            }),
          )
        }
        confirmLoading={actionMutation.isPending}
      >
        <Form form={form} layout="vertical">
          {/* 审批单摘要 */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Text className="font-bold text-slate-900 block">
              {selectedReq?.requestNo}
            </Text>
            <Text className="text-slate-500 text-sm">
              {selectedReq?.summary}
            </Text>
            {selectedReq?.amount && (
              <Text className="font-black text-red-600 block mt-1">
                ￥{Number(selectedReq.amount).toLocaleString()}
              </Text>
            )}
          </div>

          {/* 转审人选择 */}
          {action === "transferred" && (
            <Form.Item
              label="转审给"
              name="target_user_id"
              rules={[{ required: true, message: "请选择转审人" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="搜索姓名或工号"
                options={people.map((p) => ({
                  label: `${p.name}（${p.department}）`,
                  value: p.id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            label={action === "rejected" ? "驳回原因（必填）" : "审批意见"}
            name="comment"
            rules={
              action === "rejected"
                ? [{ required: true, message: "请填写驳回原因" }]
                : []
            }
          >
            <Input.TextArea
              rows={4}
              placeholder={
                action === "approved"
                  ? "可选，填写审批意见"
                  : action === "rejected"
                    ? "请说明驳回原因"
                    : "请说明转审原因"
              }
            />
          </Form.Item>
        </Form>
      </BaseModal>

      {/* 批量操作弹窗 */}
      <BaseModal
        open={batchOpen}
        title={
          batchAction === "approved"
            ? `✅ 批量同意审批 (${selectedIds.length}条)`
            : `❌ 批量驳回审批 (${selectedIds.length}条)`
        }
        onCancel={() => {
          setBatchOpen(false);
          batchForm.resetFields();
        }}
        onOk={() =>
          batchForm.validateFields().then((v) =>
            batchActionMutation.mutate({
              action: batchAction,
              ...v,
            }),
          )
        }
        confirmLoading={batchActionMutation.isPending}
      >
        <Form form={batchForm} layout="vertical">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Text className="font-bold text-slate-900 block mb-2">
              即将{batchAction === "approved" ? "同意" : "驳回"}{" "}
              {selectedIds.length} 条审批单
            </Text>
            <Text className="text-slate-500 text-sm">
              请确认您有权限处理这些审批单，批量操作将对所有选中的审批单生效
            </Text>
          </div>

          <Form.Item
            label={batchAction === "rejected" ? "驳回原因（必填）" : "审批意见"}
            name="comment"
            rules={
              batchAction === "rejected"
                ? [{ required: true, message: "请填写驳回原因" }]
                : []
            }
          >
            <Input.TextArea
              rows={4}
              placeholder={
                batchAction === "approved"
                  ? "可选，填写审批意见"
                  : "请说明驳回原因"
              }
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </div>
  );
}
