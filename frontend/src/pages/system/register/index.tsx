import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Typography,
  Descriptions,
  Badge,
} from "antd";
import {
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { authApi } from "@/api/auth";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

export default function RegisterManagePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 20,
    status: "",
    keyword: "",
    deptId: "",
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [approveForm] = Form.useForm();

  // 获取注册申请列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["register-list", searchParams],
    queryFn: () => authApi.getRegisterList(searchParams),
  });

  // 单个审核
  const approveMutation = useMutation({
    mutationFn: authApi.approveRegister,
    onSuccess: () => {
      message.success("审核成功");
      setApproveModalVisible(false);
      approveForm.resetFields();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["register-list"] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "审核失败");
    },
  });

  // 批量审核
  const batchApproveMutation = useMutation({
    mutationFn: authApi.batchApproveRegister,
    onSuccess: (data: any) => {
      message.success(data.message || "批量审核完成");
      setSelectedRowKeys([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["register-list"] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "批量审核失败");
    },
  });

  // 查看详情
  const handleViewDetail = async (record: any) => {
    try {
      const detail = await authApi.getRegisterDetail(record.id);
      setCurrentRecord(detail);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || "获取详情失败");
    }
  };

  // 审核操作
  const handleApprove = (record: any, status: "approved" | "rejected") => {
    setCurrentRecord(record);
    approveForm.setFieldsValue({ status });
    setApproveModalVisible(true);
  };

  // 提交审核
  const handleApproveSubmit = async () => {
    try {
      const values = await approveForm.validateFields();
      await approveMutation.mutateAsync({
        id: currentRecord.id,
        status: values.status,
        rejectReason: values.rejectReason,
      });
    } catch (error) {
      // 表单验证失败或审核失败
    }
  };

  // 批量审核
  const handleBatchApprove = (status: "approved" | "rejected") => {
    if (selectedRowKeys.length === 0) {
      message.warning("请先选择要审核的申请");
      return;
    }

    if (status === "rejected") {
      Modal.confirm({
        title: "批量拒绝",
        content: (
          <Form>
            <Form.Item
              label="拒绝原因"
              name="rejectReason"
              rules={[{ required: true, message: "请填写拒绝原因" }]}
            >
              <TextArea rows={4} placeholder="请填写拒绝原因" />
            </Form.Item>
          </Form>
        ),
        onOk: async (close) => {
          const form = Modal.useForm()[0];
          try {
            const values = await form.validateFields();
            await batchApproveMutation.mutateAsync({
              ids: selectedRowKeys,
              status,
              rejectReason: values.rejectReason,
            });
            close();
          } catch (error) {
            return Promise.reject(error);
          }
        },
      });
    } else {
      Modal.confirm({
        title: "批量通过",
        content: `确定要通过选中的 ${selectedRowKeys.length} 条注册申请吗？`,
        onOk: async () => {
          await batchApproveMutation.mutateAsync({
            ids: selectedRowKeys,
            status,
          });
        },
      });
    }
  };

  // 状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: "processing", text: "待审核" },
      approved: { color: "success", text: "已通过" },
      rejected: { color: "error", text: "已拒绝" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 100,
    },
    {
      title: "手机号",
      dataIndex: "phone",
      key: "phone",
      width: 120,
    },
    {
      title: "所属部门",
      dataIndex: ["biz_department", "name"],
      key: "department",
      width: 150,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "申请时间",
      dataIndex: "create_time",
      key: "create_time",
      width: 180,
      render: (time: string) => dayjs(time).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "审核时间",
      dataIndex: "approve_time",
      key: "approve_time",
      width: 180,
      render: (time: string) =>
        time ? dayjs(time).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "审核人",
      dataIndex: ["approver", "name"],
      key: "approver",
      width: 100,
      render: (name: string) => name || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === "pending" && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record, "approved")}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleApprove(record, "rejected")}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">注册审核管理</span>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              刷新
            </Button>
          </div>
        }
      >
        {/* 搜索栏 */}
        <div className="mb-4 flex gap-4">
          <Input
            placeholder="搜索姓名或手机号"
            prefix={<SearchOutlined />}
            value={searchParams.keyword}
            onChange={(e) =>
              setSearchParams({ ...searchParams, keyword: e.target.value })
            }
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="选择状态"
            value={searchParams.status || undefined}
            onChange={(value) =>
              setSearchParams({ ...searchParams, status: value || "" })
            }
            style={{ width: 150 }}
            allowClear
            options={[
              { label: "待审核", value: "pending" },
              { label: "已通过", value: "approved" },
              { label: "已拒绝", value: "rejected" },
            ]}
          />
        </div>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded flex items-center justify-between">
            <Text>
              已选择 <Text strong>{selectedRowKeys.length}</Text> 项
            </Text>
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleBatchApprove("approved")}
                loading={batchApproveMutation.isPending}
              >
                批量通过
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleBatchApprove("rejected")}
                loading={batchApproveMutation.isPending}
              >
                批量拒绝
              </Button>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </Space>
          </div>
        )}

        {/* 表格 */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record: any) => ({
              disabled: record.status !== "pending",
            }),
          }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.pageSize,
            total: data?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) =>
              setSearchParams({ ...searchParams, page, pageSize }),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="注册申请详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          currentRecord?.status === "pending" && (
            <>
              <Button
                key="approve"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setDetailModalVisible(false);
                  handleApprove(currentRecord, "approved");
                }}
              >
                通过
              </Button>
              <Button
                key="reject"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setDetailModalVisible(false);
                  handleApprove(currentRecord, "rejected");
                }}
              >
                拒绝
              </Button>
            </>,
          ),
        ]}
        width={700}
      >
        {currentRecord && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="姓名" span={1}>
              {currentRecord.name}
            </Descriptions.Item>
            <Descriptions.Item label="手机号" span={1}>
              {currentRecord.phone}
            </Descriptions.Item>
            <Descriptions.Item label="所属部门" span={2}>
              {currentRecord.biz_department?.name}
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              {getStatusTag(currentRecord.status)}
            </Descriptions.Item>
            <Descriptions.Item label="申请时间" span={2}>
              {dayjs(currentRecord.create_time).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            {currentRecord.approve_time && (
              <>
                <Descriptions.Item label="审核时间" span={2}>
                  {dayjs(currentRecord.approve_time).format(
                    "YYYY-MM-DD HH:mm:ss",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="审核人" span={2}>
                  {currentRecord.approver?.name || "-"}
                </Descriptions.Item>
              </>
            )}
            {currentRecord.reject_reason && (
              <Descriptions.Item label="拒绝原因" span={2}>
                <Text type="danger">{currentRecord.reject_reason}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 审核弹窗 */}
      <Modal
        title={
          approveForm.getFieldValue("status") === "approved"
            ? "审核通过"
            : "审核拒绝"
        }
        open={approveModalVisible}
        onOk={handleApproveSubmit}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
        }}
        confirmLoading={approveMutation.isPending}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item name="status" hidden>
            <Input />
          </Form.Item>
          {approveForm.getFieldValue("status") === "rejected" && (
            <Form.Item
              name="rejectReason"
              label="拒绝原因"
              rules={[{ required: true, message: "请填写拒绝原因" }]}
            >
              <TextArea
                rows={4}
                placeholder="请填写拒绝原因，将通知给申请人"
              />
            </Form.Item>
          )}
          {approveForm.getFieldValue("status") === "approved" && (
            <div className="text-center py-4">
              <CheckCircleOutlined
                style={{ fontSize: 48, color: "#52c41a" }}
              />
              <div className="mt-4">
                <Text>确定要通过该注册申请吗？</Text>
                <br />
                <Text type="secondary">通过后将自动创建用户账号</Text>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
