/**
 * 系统日志页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和一致的用户体验
 */

import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Form, Modal, Space, message } from "antd";
import {
  ContainerOutlined,
  ExclamationCircleOutlined,
  LoginOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { systemApi } from "@/api/system";
import { PageContainer, SectionCard } from '@/components/layout';
import { ActionBar, FilterBar } from '@/components/business';
import { Table, Button } from '@/components/ui';
import { LogDetailDrawer } from "./components/LogDetailDrawer";
import { getLoginColumns, getOperationColumns } from "./components/columns";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

type LogTab = "operation" | "login";

const OPERATION_MODULES = [
  "用户管理", "角色管理", "菜单管理", "权限管理", "部门管理", "平台管理",
  "店铺管理", "考勤管理", "排班管理", "人员管理", "知识库", "考试管理",
  "财务管理", "审批管理", "客服管理", "系统设置", "数据映射", "消息管理",
];

const SystemLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LogTab>("operation");
  const [detail, setDetail] = useState<any>(null);
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [globalLoading, setGlobalLoading] = useState(false);

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => refetch(),
    "ctrl+e": () => handleExport(),
    escape: () => {
      if (detail) {
        setDetail(null);
      }
    },
  });

  // 查询日志数据
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
    staleTime: 5 * 60 * 1000,
  });

  // 查询公共数据
  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms-list"],
    queryFn: systemApi.listPlatforms,
    staleTime: 5 * 60 * 1000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: systemApi.listDepartments,
    staleTime: 5 * 60 * 1000,
  });

  // 搜索处理
  const handleSearch = (values: any) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    // 触发 useQuery 重新运行
  };

  // 重置处理
  const handleReset = () => {
    filterForm.resetFields();
    setPagination({ page: 1, pageSize: 20 });
  };

  // 导出处理
  const handleExport = async () => {
    const total = logData?.total || 0;
    if (total === 0) {
      message.error("无匹配日志，无法导出报表");
      return;
    }

    if (total > 100000) {
      Modal.confirm({
        title: "数据量过大提示",
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: "导出数据量超过 10 万条，建议分批次导出。是否继续导出前 1 万条？",
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
      setGlobalLoading(true);
      const values = filterForm.getFieldsValue();
      const params: Record<string, any> = {
        ...values,
        start_date: values.date?.[0]?.format("YYYY-MM-DD HH:mm:ss"),
        end_date: values.date?.[1]?.format("YYYY-MM-DD HH:mm:ss"),
        status: values.status === "all" ? undefined : values.status,
      };

      const response = activeTab === "operation"
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
      message.error("导出失败");
    } finally {
      setGlobalLoading(false);
    }
  };

  // 快捷日期处理
  const handleQuickDate = (value: string) => {
    const now = dayjs();
    const rangeMap: Record<string, [dayjs.Dayjs, dayjs.Dayjs]> = {
      today: [now.startOf("day"), now.endOf("day")],
      yesterday: [
        now.subtract(1, "day").startOf("day"),
        now.subtract(1, "day").endOf("day"),
      ],
      "7days": [now.subtract(6, "days").startOf("day"), now.endOf("day")],
      "30days": [now.subtract(29, "days").startOf("day"), now.endOf("day")],
    };
    if (rangeMap[value]) {
      filterForm.setFieldValue("date", rangeMap[value]);
    }
  };

  // 筛选项配置
  const filterItems = useMemo(() => {
    const baseItems = [
      {
        name: 'keyword',
        label: '关键词',
        type: 'input' as const,
        placeholder: activeTab === 'operation' ? '操作人/IP/描述' : '登录人/账号/IP',
      },
      {
        name: 'platform_id',
        label: '平台',
        type: 'select' as const,
        options: platforms.map((p: any) => ({ label: p.name, value: p.id })),
      },
      {
        name: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部', value: 'all' },
          { label: '成功', value: 1 },
          { label: '失败', value: 0 },
        ],
      },
      {
        name: 'date',
        label: '时间范围',
        type: 'dateRange' as const,
      },
    ];

    if (activeTab === 'operation') {
      return [
        baseItems[0],
        {
          name: 'dept_id',
          label: '部门',
          type: 'select' as const,
          options: departments.map((d: any) => ({ label: d.name, value: d.id })),
        },
        {
          name: 'module',
          label: '模块',
          type: 'select' as const,
          options: OPERATION_MODULES.map(m => ({ label: m, value: m })),
        },
        ...baseItems.slice(1),
      ];
    }

    return baseItems;
  }, [activeTab, platforms, departments]);

  const columns = activeTab === "operation"
    ? getOperationColumns(setDetail)
    : getLoginColumns(setDetail);

  return (
    <PageContainer
      title="系统日志"
      subTitle="审计系统操作行为与登录记录，确保系统安全可追溯"
      tabs={{
        activeKey: activeTab,
        onChange: (key) => {
          setActiveTab(key as LogTab);
          setPagination({ page: 1, pageSize: 20 });
          filterForm.resetFields();
        },
        items: [
          {
            key: 'operation',
            label: (
              <Space>
                <ContainerOutlined />
                操作审计
              </Space>
            ),
          },
          {
            key: 'login',
            label: (
              <Space>
                <LoginOutlined />
                登录日志
              </Space>
            ),
          },
        ],
      }}
    >
      <GlobalLoading loading={globalLoading} />

      {/* 筛选区域 */}
      <SectionCard title="筛选条件" collapsible>
        <FilterBar
          form={filterForm}
          items={filterItems}
          onSearch={handleSearch}
          onReset={handleReset}
          glass
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'refresh',
              label: '刷新',
              icon: <ReloadOutlined />,
              onClick: () => refetch(),
            },
            {
              key: 'export',
              label: '导出数据',
              icon: <DownloadOutlined />,
              onClick: handleExport,
            },
          ]}
          extra={
            <span style={{ color: '#999', fontSize: 14 }}>
              共 {logData?.total || 0} 条日志记录
            </span>
          }
          align="space-between"
          glass
        />

        <Table
          columns={columns}
          dataSource={logData?.items || []}
          loading={isLoading}
          rowKey="id"
          glass
          density="compact"
          striped
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: logData?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => setPagination({ page, pageSize: pageSize || 20 }),
          }}
          scroll={{ x: 1200 }}
        />
      </SectionCard>

      {/* 详情抽屉 */}
      <LogDetailDrawer
        open={!!detail}
        record={detail}
        type={activeTab}
        onClose={() => setDetail(null)}
      />
    </PageContainer>
  );
};

export default SystemLogsPage;

