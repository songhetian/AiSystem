import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Modal,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  ContainerOutlined,
  ExclamationCircleOutlined,
  LoginOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { systemApi } from "@/api/system";
import { BaseTable } from "@/components/table/BaseTable";
import { LogFilterBar } from "./components/LogFilterBar";
import { LogDetailDrawer } from "./components/LogDetailDrawer";
import { getLoginColumns, getOperationColumns } from "./components/columns";

type LogTab = "operation" | "login";

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<LogTab>("operation");
  const [detail, setDetail] = useState<any>(null);
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  const {
    data: logData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "system-logs",
      activeTab,
      pagination.page,
      pagination.pageSize,
      filterForm.getFieldsValue(),
    ],
    queryFn: async () => {
      const values = filterForm.getFieldsValue();
      const params: Record<string, any> = {
        ...values,
        page: pagination.page,
        pageSize: pagination.pageSize,
        start_date: values.date?.[0]?.format("YYYY-MM-DD HH:mm:ss"),
        end_date: values.date?.[1]?.format("YYYY-MM-DD HH:mm:ss"),
        status: values.status === "all" ? undefined : values.status,
      };
      delete params.date;
      delete params.quickDate;

      return activeTab === "operation"
        ? systemApi.listOperationLogs(params)
        : systemApi.listLoginLogs(params);
    },
  });

  // 监听 V2.0 元数据反馈
  useEffect(() => {
    if (logData?.meta?.isDateCorrected) {
      message.info("时间范围不合理，系统已自动修正");
    }
    if (logData?.meta?.isKeywordTruncated) {
      message.warning("搜索关键词过长，系统已截取前 50 字进行匹配");
    }
  }, [logData]);

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms-list"],
    queryFn: systemApi.listPlatforms,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: systemApi.listDepartments,
  });

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    refetch();
  };

  const handleReset = () => {
    filterForm.resetFields();
    setPagination({ page: 1, pageSize: 20 });
  };

  const handleExport = async () => {
    const total = logData?.total || 0;

    if (total === 0) {
      message.error("无匹配日志，无法导出报表");
      return;
    }

    if (total > 100000) {
      Modal.confirm({
        title: "数据量过大提示",
        icon: <ExclamationCircleOutlined className="text-orange-500" />,
        content:
          "导出数据量超过 10 万条，建议分批次（按时间范围）导出以保障性能。是否继续导出当前前 1 万条？",
        okText: "继续导出",
        cancelText: "取消",
        onOk: performExport,
      });
      return;
    }

    performExport();
  };

  const performExport = async () => {
    try {
      const values = filterForm.getFieldsValue();
      const params: Record<string, any> = {
        ...values,
        start_date: values.date?.[0]?.format("YYYY-MM-DD HH:mm:ss"),
        end_date: values.date?.[1]?.format("YYYY-MM-DD HH:mm:ss"),
        status: values.status === "all" ? undefined : values.status,
      };
      delete params.date;
      delete params.quickDate;

      const response =
        activeTab === "operation"
          ? await systemApi.exportOperationLogs(params)
          : await systemApi.exportLoginLogs(params);

      const blob = new Blob([response], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeTab === "operation" ? "操作日志" : "登录日志"}_导出_${dayjs().format("YYYYMMDDHHmmss")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("导出成功");
    } catch {
      message.error("导出失败，服务端异常或网络繁忙");
    }
  };

  const operationColumns = getOperationColumns(setDetail);
  const loginColumns = getLoginColumns(setDetail);

  return (
    <div className="p-4 space-y-4 bg-white min-h-screen">
      {/* Tab 切换 */}
      <Card
        bordered={false}
        className="shadow-sm rounded-none border-b border-slate-200 p-0"
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k as LogTab);
            setPagination({ page: 1, pageSize: 20 });
            filterForm.resetFields();
          }}
          items={[
            {
              key: "operation",
              label: (
                <Space>
                  <ContainerOutlined />
                  操作审计
                </Space>
              ),
            },
            {
              key: "login",
              label: (
                <Space>
                  <LoginOutlined />
                  登录日志
                </Space>
              ),
            },
          ]}
          className="mb-0 custom-tabs"
        />
      </Card>

      {/* 筛选栏 */}
      <Card
        bordered={false}
        className="shadow-none rounded-xl bg-slate-50 border border-slate-200"
      >
        <LogFilterBar
          form={filterForm}
          type={activeTab}
          platforms={platforms as any[]}
          departments={departments as any[]}
          onSearch={handleSearch}
          onReset={handleReset}
          onExport={handleExport}
        />
      </Card>

      {/* 数据表格 */}
      <Card
        bordered={false}
        className="shadow-sm rounded-xl overflow-hidden border border-slate-200"
      >
        <BaseTable
          columns={activeTab === "operation" ? operationColumns : loginColumns}
          dataSource={logData?.items || []}
          loading={isLoading}
          rowKey="id"
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <Typography.Title
                  level={5}
                  className="text-slate-400 mb-4 font-bold"
                >
                  未找到匹配的日志记录
                </Typography.Title>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  className="font-black border-slate-500"
                >
                  重置筛选条件
                </Button>
              </div>
            ),
          }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: logData?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total: number) => `共 ${total} 条`,
            onChange: (page: number, pageSize?: number) =>
              setPagination({ page, pageSize: pageSize || 20 }),
            className: "pr-4 pb-4 font-bold text-slate-900",
          }}
          className="custom-log-table"
        />
      </Card>

      {/* 详情抽屉 */}
      <LogDetailDrawer
        open={!!detail}
        record={detail}
        type={activeTab}
        onClose={() => setDetail(null)}
      />

      <style>{`
        .custom-tabs .ant-tabs-tab-btn { font-weight: 900 !important; color: #64748b !important; font-size: 16px !important; }
        .custom-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #0f172a !important; }
        .custom-tabs .ant-tabs-ink-bar { background: #0f172a !important; height: 3px !important; }
        .custom-log-table .ant-table-thead > tr > th { background: #f8fafc !important; color: #475569 !important; font-weight: 900 !important; font-size: 13px !important; border-bottom: 2px solid #e2e8f0 !important; }
      `}</style>
    </div>
  );
}
