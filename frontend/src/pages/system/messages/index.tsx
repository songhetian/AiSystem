import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import { approvalApi, type ApprovalPerson } from "@/api/approval";
import { systemApi, type SystemMessageRecord } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import {
  buildMessageMetaTags,
  buildMessageSearchText,
  resolveMessageAppearance,
  type MessageCategory,
} from "@/utils/message-center";
import { createIdempotencyKey } from "@/utils/request";

type MessageView = "all" | "unread" | "read";
type CategoryView = "all" | MessageCategory;
type ActionType = "approve" | "reject" | "transfer";

function canQuickApprove(record: SystemMessageRecord) {
  return (
    record.message_type === "approval_pending" &&
    Boolean(record.payload?.requestId)
  );
}

export default function SystemMessagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [view, setView] = useState<MessageView>("all");
  const [category, setCategory] = useState<CategoryView>("all");
  const [actionType, setActionType] = useState<ActionType>();
  const [actionTarget, setActionTarget] = useState<SystemMessageRecord | null>(
    null,
  );
  const actionKeyRef = useRef<string>();
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery<SystemMessageRecord[]>({
    queryKey: ["system-messages", "all"],
    queryFn: () => systemApi.listMessages(),
  });

  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ["approval-request-people"],
    queryFn: approvalApi.listPeople,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["system-messages"] });
    await queryClient.invalidateQueries({ queryKey: ["system-message-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
    await queryClient.invalidateQueries({
      queryKey: ["approval-request-stats"],
    });
  };

  const markReadMutation = useMutation({
    mutationFn: systemApi.markMessageRead,
    onSuccess: refresh,
  });

  const markAllReadMutation = useMutation({
    mutationFn: systemApi.markAllMessagesRead,
    onSuccess: refresh,
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      messageId,
      requestId,
      comment,
    }: {
      messageId: string;
      requestId: string;
      comment?: string;
    }) => {
      await approvalApi.approveRequest(
        requestId,
        { comment },
        {
          idempotencyKey:
            actionKeyRef.current ??
            (actionKeyRef.current = createIdempotencyKey(
              `message-approve-${requestId}`,
            )),
        },
      );
      await systemApi.markMessageRead(messageId);
    },
    onSuccess: async () => {
      message.success("审批已同意");
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      messageId,
      requestId,
      comment,
    }: {
      messageId: string;
      requestId: string;
      comment?: string;
    }) => {
      await approvalApi.rejectRequest(
        requestId,
        { comment },
        {
          idempotencyKey:
            actionKeyRef.current ??
            (actionKeyRef.current = createIdempotencyKey(
              `message-reject-${requestId}`,
            )),
        },
      );
      await systemApi.markMessageRead(messageId);
    },
    onSuccess: async () => {
      message.success("审批已驳回");
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({
      messageId,
      requestId,
      assigneeId,
      comment,
    }: {
      messageId: string;
      requestId: string;
      assigneeId: string;
      comment?: string;
    }) => {
      await approvalApi.transferRequest(
        requestId,
        { assigneeId, comment },
        {
          idempotencyKey:
            actionKeyRef.current ??
            (actionKeyRef.current = createIdempotencyKey(
              `message-transfer-${requestId}`,
            )),
        },
      );
      await systemApi.markMessageRead(messageId);
    },
    onSuccess: async () => {
      message.success("审批已转审");
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    },
  });

  const actionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    transferMutation.isPending;

  const summary = useMemo(
    () => ({
      total: data.length,
      unread: data.filter((item) => item.read_status === 0).length,
      approval: data.filter(
        (item) =>
          resolveMessageAppearance(item.message_type).category === "approval",
      ).length,
      schedule: data.filter(
        (item) =>
          resolveMessageAppearance(item.message_type).category === "schedule",
      ).length,
      system: data.filter(
        (item) =>
          resolveMessageAppearance(item.message_type).category === "system",
      ).length,
      actionable: data.filter(
        (item) => item.read_status === 0 && canQuickApprove(item),
      ).length,
    }),
    [data],
  );

  const filteredData = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return data.filter((item) => {
      const appearance = resolveMessageAppearance(item.message_type);
      const matchesKeyword =
        !normalizedKeyword ||
        buildMessageSearchText(item).includes(normalizedKeyword);
      const matchesView =
        view === "all" ||
        (view === "unread" ? item.read_status === 0 : item.read_status === 1);
      const matchesCategory =
        category === "all" || appearance.category === category;

      return matchesKeyword && matchesView && matchesCategory;
    });
  }, [category, data, keyword, view]);

  const openMessage = async (record: SystemMessageRecord) => {
    if (record.read_status === 0) {
      await systemApi.markMessageRead(record.id);
      await refresh();
    }

    if (record.route) {
      navigate(record.route);
    }
  };

  const openActionModal = (type: ActionType, record: SystemMessageRecord) => {
    setActionType(type);
    setActionTarget(record);
    actionKeyRef.current = undefined;
    form.resetFields();
  };

  const handleSubmitAction = async () => {
    const requestId = actionTarget?.payload?.requestId;
    if (!actionTarget || !requestId || !actionType) {
      return;
    }

    const values = await form.validateFields();

    if (actionType === "approve") {
      approveMutation.mutate({
        messageId: actionTarget.id,
        requestId,
        comment: values.comment,
      });
      return;
    }

    if (actionType === "reject") {
      rejectMutation.mutate({
        messageId: actionTarget.id,
        requestId,
        comment: values.comment,
      });
      return;
    }

    transferMutation.mutate({
      messageId: actionTarget.id,
      requestId,
      assigneeId: values.assigneeId,
      comment: values.comment,
    });
  };

  const columns: ProColumns<SystemMessageRecord>[] = [
    {
      title: "消息",
      dataIndex: "title",
      render: (_, record) => {
        const appearance = resolveMessageAppearance(record.message_type);
        const metaTags = buildMessageMetaTags(record.payload);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Space wrap size={[8, 8]}>
              <Tag color="blue">{appearance.label}</Tag>
              {record.read_status === 1 ? (
                <Tag>已读</Tag>
              ) : (
                <Tag color="processing">未读</Tag>
              )}
              {canQuickApprove(record) && record.read_status === 0 ? (
                <Tag color="gold">可快捷审批</Tag>
              ) : null}
            </Space>
            <Typography.Text strong>{record.title}</Typography.Text>
            <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
              {record.content}
            </Typography.Paragraph>
            {metaTags.length ? (
              <Space wrap size={[8, 8]}>
                {metaTags.map((tag) => (
                  <Tag key={tag} bordered={false} color="default">
                    {tag}
                  </Tag>
                ))}
              </Space>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "发送人",
      dataIndex: "sender_name",
      width: 140,
      render: (_, record) => record.sender_name || "-",
    },
    {
      title: "时间",
      dataIndex: "create_time",
      width: 180,
    },
    {
      title: "操作",
      width: 260,
      render: (_, record) => (
        <Space wrap>
          {record.read_status === 0 ? (
            <Permission code="system:message:read">
              <Button
                type="link"
                onClick={() => markReadMutation.mutate(record.id)}
              >
                标记已读
              </Button>
            </Permission>
          ) : null}
          {record.route ? (
            <Button type="link" onClick={() => void openMessage(record)}>
              查看详情
            </Button>
          ) : null}
          {canQuickApprove(record) && record.read_status === 0 ? (
            <>
              <Permission code="approval:request:approve">
                <Button
                  type="link"
                  disabled={actionPending}
                  onClick={() => openActionModal("approve", record)}
                >
                  同意
                </Button>
              </Permission>
              <Permission code="approval:request:reject">
                <Button
                  type="link"
                  danger
                  disabled={actionPending}
                  onClick={() => openActionModal("reject", record)}
                >
                  驳回
                </Button>
              </Permission>
              <Permission code="approval:request:transfer">
                <Button
                  type="link"
                  disabled={actionPending}
                  onClick={() => openActionModal("transfer", record)}
                >
                  转审
                </Button>
              </Permission>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="站内消息"
        extra={
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索标题、内容、审批单号、调班单号、请假单号"
              onChange={(event) => setKeyword(event.target.value)}
              style={{ width: 320 }}
            />
            <Segmented<MessageView>
              value={view}
              onChange={setView}
              options={[
                { label: `全部 ${summary.total}`, value: "all" },
                { label: `未读 ${summary.unread}`, value: "unread" },
                {
                  label: `已读 ${summary.total - summary.unread}`,
                  value: "read",
                },
              ]}
            />
            <Segmented<CategoryView>
              value={category}
              onChange={setCategory}
              options={[
                { label: "全部类型", value: "all" },
                { label: `审批 ${summary.approval}`, value: "approval" },
                { label: `调班/联动 ${summary.schedule}`, value: "schedule" },
                { label: `系统 ${summary.system}`, value: "system" },
              ]}
            />
            <Permission code="system:message:read">
              <Button
                type="primary"
                onClick={() => markAllReadMutation.mutate()}
                loading={markAllReadMutation.isPending}
              >
                全部已读
              </Button>
            </Permission>
          </Space>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Card size="small">
            <Typography.Text type="secondary">未读消息</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.unread}
            </div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">可快捷审批</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.actionable}
            </div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">审批通道</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.approval}
            </div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">调班 / 联动</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.schedule}
            </div>
          </Card>
          <Card size="small">
            <Typography.Text type="secondary">系统消息</Typography.Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.system}
            </div>
          </Card>
        </div>

        <BaseTable<SystemMessageRecord>
          rowKey="id"
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
        />
      </Card>

      <BaseModal
        title={
          actionType === "approve"
            ? "快捷同意审批"
            : actionType === "reject"
              ? "快捷驳回审批"
              : "快捷转审"
        }
        open={Boolean(actionType && actionTarget)}
        confirmLoading={actionPending}
        onCancel={() => {
          setActionType(undefined);
          setActionTarget(null);
          form.resetFields();
        }}
        onOk={() => void handleSubmitAction()}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="消息标题">
            <Typography.Text>{actionTarget?.title ?? "-"}</Typography.Text>
          </Form.Item>
          <Form.Item label="审批单号">
            <Typography.Text>
              {actionTarget?.payload?.requestNo ?? "-"}
            </Typography.Text>
          </Form.Item>
          {actionType === "transfer" ? (
            <Form.Item
              label="转交给"
              name="assigneeId"
              rules={[{ required: true, message: "请选择转交对象" }]}
            >
              <Select
                showSearch
                placeholder="选择处理人"
                options={people.map((person) => ({
                  label: `${person.name} · ${person.department} · ${person.title}`,
                  value: person.id,
                }))}
                optionFilterProp="label"
              />
            </Form.Item>
          ) : null}
          <Form.Item
            label={
              actionType === "approve"
                ? "审批意见"
                : actionType === "reject"
                  ? "驳回原因"
                  : "转审备注"
            }
            name="comment"
            rules={
              actionType === "reject"
                ? [{ required: true, message: "请填写驳回原因" }]
                : undefined
            }
          >
            <Input.TextArea
              rows={4}
              placeholder="输入处理意见"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
