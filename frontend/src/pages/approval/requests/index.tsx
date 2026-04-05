import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProColumns } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Drawer, Form, Input, Select, Segmented, Space, Tag, Typography, message } from 'antd';
import { useLocation, useNavigate } from 'umi';
import { approvalApi, type ApprovalPerson, type ApprovalRequestRecord } from '@/api/approval';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { BaseTable } from '@/components/table/BaseTable';
import { createIdempotencyKey } from '@/utils/request';

type ApprovalView = 'all' | 'my' | 'pending' | 'processed';

const statusColorMap: Record<ApprovalRequestRecord['status'], string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
  transferred: 'warning'
};

const statusTextMap: Record<ApprovalRequestRecord['status'], string> = {
  pending: '待处理',
  approved: '已通过',
  rejected: '已驳回',
  transferred: '已转审'
};

const actionTextMap: Record<ApprovalRequestRecord['progress'][number]['action'], string> = {
  submitted: '提交申请',
  approved: '审批通过',
  rejected: '审批驳回',
  transferred: '转审处理'
};

function isValidView(value: string | null): value is ApprovalView {
  return value === 'all' || value === 'my' || value === 'pending' || value === 'processed';
}

export default function ApprovalRequestsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestNoFromQuery = searchParams.get('requestNo')?.trim() ?? '';
  const initialView = isValidView(searchParams.get('view')) ? searchParams.get('view') : 'my';
  const [view, setView] = useState<ApprovalView>(initialView);
  const [keyword, setKeyword] = useState(requestNoFromQuery);
  const [detail, setDetail] = useState<ApprovalRequestRecord | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'transfer'>();
  const [actionTarget, setActionTarget] = useState<ApprovalRequestRecord | null>(null);
  const [form] = Form.useForm();
  const actionKeyRef = useRef<string>();
  const autoOpenedRequestNoRef = useRef<string>();

  const { data = [], isLoading } = useQuery<ApprovalRequestRecord[]>({
    queryKey: ['approval-requests', view, keyword],
    queryFn: () => approvalApi.listRequests({ view, keyword: keyword || undefined })
  });

  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ['approval-request-people'],
    queryFn: approvalApi.listPeople
  });

  useEffect(() => {
    if (!requestNoFromQuery) {
      autoOpenedRequestNoRef.current = undefined;
      return;
    }

    setKeyword(requestNoFromQuery);
    if (view !== initialView) {
      setView(initialView);
    }
  }, [initialView, requestNoFromQuery, view]);

  useEffect(() => {
    if (!requestNoFromQuery || autoOpenedRequestNoRef.current === requestNoFromQuery || data.length === 0) {
      return;
    }

    const matched = data.find((item) => item.requestNo === requestNoFromQuery);
    if (!matched) {
      return;
    }

    setDetail(matched);
    autoOpenedRequestNoRef.current = requestNoFromQuery;
  }, [data, requestNoFromQuery]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalApi.approveRequest(id, { comment }, {
        idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`approval-approve-${id}`))
      }),
    onSuccess: async () => {
      message.success('审批已通过');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      approvalApi.rejectRequest(id, { comment }, {
        idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`approval-reject-${id}`))
      }),
    onSuccess: async () => {
      message.success('审批已驳回');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const transferMutation = useMutation({
    mutationFn: ({ id, assigneeId, comment }: { id: string; assigneeId: string; comment?: string }) =>
      approvalApi.transferRequest(id, { assigneeId, comment }, {
        idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`approval-transfer-${id}`))
      }),
    onSuccess: async () => {
      message.success('审批已转审');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refresh();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const actionPending = approveMutation.isPending || rejectMutation.isPending || transferMutation.isPending;

  const columns: ProColumns<ApprovalRequestRecord>[] = [
    { title: '审批单号', dataIndex: 'requestNo' },
    { title: '模板', dataIndex: 'templateName' },
    { title: '申请人', dataIndex: 'applicantName' },
    { title: '摘要', dataIndex: 'summary', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => <Tag color={statusColorMap[record.status]}>{statusTextMap[record.status]}</Tag>
    },
    { title: '当前处理人', dataIndex: 'currentApproverName', render: (_, record) => record.currentApproverName ?? '-' },
    { title: '更新时间', dataIndex: 'updatedAt' },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button type="link" disabled={actionPending} onClick={() => setDetail(record)}>
            详情
          </Button>
          {view === 'pending' && record.status === 'pending' ? (
            <>
              <Permission code="approval:request:approve">
                <Button
                  type="link"
                  disabled={actionPending}
                  onClick={() => {
                    setActionType('approve');
                    setActionTarget(record);
                    actionKeyRef.current = undefined;
                  }}
                >
                  同意
                </Button>
              </Permission>
              <Permission code="approval:request:reject">
                <Button
                  type="link"
                  danger
                  disabled={actionPending}
                  onClick={() => {
                    setActionType('reject');
                    setActionTarget(record);
                    actionKeyRef.current = undefined;
                  }}
                >
                  驳回
                </Button>
              </Permission>
              <Permission code="approval:request:transfer">
                <Button
                  type="link"
                  disabled={actionPending}
                  onClick={() => {
                    setActionType('transfer');
                    setActionTarget(record);
                    actionKeyRef.current = undefined;
                  }}
                >
                  转审
                </Button>
              </Permission>
            </>
          ) : null}
        </Space>
      )
    }
  ];

  return (
    <Card
      title="审批中心"
      extra={
        <Space>
          <Input.Search
            allowClear
            value={keyword}
            placeholder="搜索单号/申请人/摘要"
            style={{ width: 260 }}
            onSearch={(value) => {
              setKeyword(value.trim());
              autoOpenedRequestNoRef.current = undefined;
            }}
            onChange={(event) => {
              const nextValue = event.target.value;
              setKeyword(nextValue);
              if (!nextValue) {
                autoOpenedRequestNoRef.current = undefined;
              }
            }}
          />
          <Segmented
            value={view}
            onChange={(value) => {
              const nextView = value as ApprovalView;
              setView(nextView);
              navigate(`/approval/requests${keyword ? `?view=${nextView}&requestNo=${encodeURIComponent(keyword)}` : `?view=${nextView}`}`, {
                replace: true
              });
            }}
            options={[
              { label: '全部', value: 'all' },
              { label: '我的审批', value: 'my' },
              { label: '待我审批', value: 'pending' },
              { label: '已处理', value: 'processed' }
            ]}
          />
        </Space>
      }
    >
      <BaseTable<ApprovalRequestRecord> rowKey="id" columns={columns} dataSource={data} loading={isLoading} />

      <Drawer
        title="审批详情"
        open={Boolean(detail)}
        width={720}
        onClose={() => {
          setDetail(null);
        }}
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ display: 'flex' }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="审批单号">{detail.requestNo}</Descriptions.Item>
              <Descriptions.Item label="审批模板">{detail.templateName}</Descriptions.Item>
              <Descriptions.Item label="申请人">{detail.applicantName}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[detail.status]}>{statusTextMap[detail.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="平台">{detail.platformName}</Descriptions.Item>
              <Descriptions.Item label="部门">{detail.departmentName}</Descriptions.Item>
              <Descriptions.Item label="业务类型">{detail.bizType ?? detail.type}</Descriptions.Item>
              <Descriptions.Item label="业务单据">{detail.bizId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{detail.updatedAt}</Descriptions.Item>
              <Descriptions.Item label="摘要" span={2}>
                {detail.summary}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="审批进度">
              <Space direction="vertical" size={12} style={{ display: 'flex' }}>
                {detail.progress.map((item) => (
                  <Card key={item.id} size="small">
                    <Space direction="vertical" size={4} style={{ display: 'flex' }}>
                      <Typography.Text strong>
                        {item.nodeName} / {item.actorName}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {item.createdAt} | {actionTextMap[item.action]}
                      </Typography.Text>
                      {item.comment ? <Typography.Text>{item.comment}</Typography.Text> : null}
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <BaseModal
        open={Boolean(actionType && actionTarget)}
        title={actionType === 'approve' ? '审批同意' : actionType === 'reject' ? '审批驳回' : '审批转审'}
        onCancel={() => {
          setActionType(undefined);
          setActionTarget(null);
          form.resetFields();
          actionKeyRef.current = undefined;
        }}
        onOk={() => form.submit()}
        confirmLoading={actionPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!actionTarget || !actionType || actionPending) {
              return;
            }

            if (actionType === 'approve') {
              approveMutation.mutate({ id: actionTarget.id, comment: values.comment });
              return;
            }

            if (actionType === 'reject') {
              rejectMutation.mutate({ id: actionTarget.id, comment: values.comment });
              return;
            }

            transferMutation.mutate({ id: actionTarget.id, assigneeId: values.assigneeId, comment: values.comment });
          }}
        >
          {actionType === 'transfer' ? (
            <Form.Item label="转审人" name="assigneeId" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={people.map((item) => ({
                  label: `${item.name} / ${item.department} / ${item.title}`,
                  value: item.id
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item label="审批意见" name="comment">
            <Input.TextArea rows={4} placeholder={actionType === 'reject' ? '请填写驳回原因' : '可填写处理说明'} />
          </Form.Item>
        </Form>
      </BaseModal>
    </Card>
  );
}
