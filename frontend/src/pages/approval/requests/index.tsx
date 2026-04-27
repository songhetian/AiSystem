/**
 * 审批中心页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  Select,
  Space,
  Typography,
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
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, StatusTag, MetricsCard } from '@/components/business';
import { Table, Button, Modal } from '@/components/ui';
import {
  approvalApi,
  type ApprovalRequest,
  type ApprovalPerson,
} from "@/api/approval";
import { downloadCSV } from "@/utils/exportUtils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { formatDate, formatCurrency } from '@/utils/format';
import {
  confirmBatchAction,
  handleExportWithProgress,
} from "@/utils/ui-helpers";

const { Text } = Typography;

type ActionType = "approved" | "rejected" | "transferred";

// 审批状态配置
const STATUS_CONFIG: Record<
  string,
  { status: 'success' | 'error' | 'warning' | 'processing' | 'default'; text: string; icon?: React.ReactNode }
> = {
  pending: {
    status: 'processing',
    text: "审批中",
    icon: <ReloadOutlined spin />,
  },
  approved: {
    status: 'success',
    text: "已通过",
    icon: <CheckCircleOutlined />
  },
  rejected: {
    status: 'error',
    text: "已驳回",
    icon: <CloseCircleOutlined />
  },
  withdrawn: {
    status: 'default',
    text: "已撤回"
  },
};

// 审批中心页面组件
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

  // 数据查询
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-requests", activeTab],
    queryFn: () => {
      if (activeTab === "pending") return approvalApi.listPendingApprovals();
      if (activeTab === "done") return approvalApi.listDoneApprovals();
      return approvalApi.listMyRequests();
    },
  });

  // 统计数据查询
  const { data: stats } = useQuery({
    queryKey: ["approval-stats"],
    queryFn: approvalApi.requestStats,
  });

  // 审批人员查询
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
    "Ctrl+e": () => {
      handleExport();
    },
    Escape: () => {
      setOpen(false);
      setBatchOpen(false);
    },
  });

  // 刷新数据
  const refresh = () => {
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
  };

  // 单个审批操作
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

  // 批量审批操作
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

  // 打开单个操作弹窗
  const openAction = (record: ApprovalRequest, act: ActionType) => {
    setSelectedReq(record);
    setAction(act);
    setOpen(true);
  };

  // 打开批量操作弹窗
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

  // 导出数据
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

  // 表格列配置
  const columns = [
    {
      title: "审批单信息",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (_: any, record: ApprovalRequest) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.requestNo}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.templateName}
          </Text>
          {record.summary && (
            <Text
              type="secondary"
              style={{ fontSize: '12px', maxWidth: 260 }}
              ellipsis={{ tooltip: record.summary }}
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
      key: "applicantName",
      width: 100,
      render: (_: any, record: ApprovalRequest) => (
        <Text strong>{record.applicantName}</Text>
      ),
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      width: 110,
      render: (_: any, record: ApprovalRequest) =>
        record.amount ? (
          <Text strong style={{ color: '#dc2626' }}>
            {formatCurrency(record.amount)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (_: any, record: ApprovalRequest) => {
        const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
        return (
          <StatusTag
            status={cfg.status}
            text={cfg.text}
            icon={cfg.icon}
          />
        );
      },
    },
    {
      title: "当前审批人",
      dataIndex: "currentApproverName",
      key: "currentApproverName",
      width: 110,
      render: (_: any, record: ApprovalRequest) =>
        record.currentApproverName ? (
          <Text>{record.currentApproverName}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "发起时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (_: any, record: ApprovalRequest) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatDate(record.createdAt)}
        </Text>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_: any, record: ApprovalRequest) => {
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
              type="danger"
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

  // 页面渲染
  return (
    <PageContainer
      title="审批中心"
      subTitle="处理待审批事项，查看审批记录"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: '审批管理' },
          { title: '审批中心' },
        ],
      }}
    >
      {/* 统计指标 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <MetricsCard
          title="待我审批"
          value={stats?.pending ?? 0}
          valueColor="#d97706"
          glass
        />
        <MetricsCard
          title="我发起的"
          value={stats?.mine ?? 0}
          valueColor="#2563eb"
          glass
        />
        <MetricsCard
          title="已处理"
          value={stats?.processed ?? 0}
          valueColor="#059669"
          glass
        />
      </div>

      {/* 审批列表 */}
      <SectionCard glass>
        <ActionBar
          actions={[
            ...(activeTab === "pending" ? [
              {
                key: 'batch-approve',
                label: `批量同意${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
                icon: <CheckCircleOutlined />,
                type: 'primary' as const,
                disabled: selectedIds.length === 0,
                onClick: () => openBatchAction("approved"),
              },
              {
                key: 'batch-reject',
                label: `批量驳回${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
                icon: <CloseCircleOutlined />,
                type: 'danger' as const,
                disabled: selectedIds.length === 0,
                onClick: () => openBatchAction("rejected"),
              },
            ] : []),
            {
              key: 'export',
              label: '导出记录',
              icon: <DownloadOutlined />,
              onClick: handleExport,
            },
          ]}
          extra={
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              items={[
                {
                  key: "pending",
                  label: (
                    <Badge count={stats?.pending ?? 0} offset={[12, 0]}>
                      <span style={{ padding: '0 8px' }}>待我审批</span>
                    </Badge>
                  ),
                },
                {
                  key: "done",
                  label: <span style={{ padding: '0 8px' }}>已审批</span>
                },
                {
                  key: "my",
                  label: <span style={{ padding: '0 8px' }}>我发起的</span>
                },
              ]}
            />
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={requests}
          loading={isLoading}
          rowKey="id"
          glass
          density="compact"
          striped
          hoverable
          rowSelection={
            activeTab === "pending"
              ? {
                  selectedRowKeys: selectedIds,
                  onChange: (keys: React.Key[]) =>
                    setSelectedIds(keys as string[]),
                }
              : undefined
          }
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
        />
      </SectionCard>

      {/* 单个审批操作弹窗 */}
      <Modal
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
        glass
      >
        <Form form={form} layout="vertical">
          {/* 审批单摘要 */}
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <Text strong style={{ display: 'block' }}>
              {selectedReq?.requestNo}
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {selectedReq?.summary}
            </Text>
            {selectedReq?.amount && (
              <Text strong style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}>
                {formatCurrency(selectedReq.amount)}
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
      </Modal>

      {/* 批量操作弹窗 */}
      <Modal
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
        glass
      >
        <Form form={batchForm} layout="vertical">
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              即将{batchAction === "approved" ? "同意" : "驳回"}{" "}
              {selectedIds.length} 条审批单
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
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
      </Modal>
    </PageContainer>
  );
}
