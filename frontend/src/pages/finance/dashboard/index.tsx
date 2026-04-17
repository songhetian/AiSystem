import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Progress,
  Space,
  Badge,
  Button,
} from "antd";
import {
  BarChartOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  TransactionOutlined,
} from "@ant-design/icons";
import { financeApi } from "@/api/finance";
import { systemApi } from "@/api/system";
import { useAppScope } from "@/hooks/useAppScope";
import { FinanceFilterBar } from "./components/FinanceFilterBar";
import { AuditLogModal } from "../components/AuditLogModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GlobalLoading from "@/components/common/GlobalLoading";

const { Title, Text } = Typography;

export default function FinanceDashboardPage() {
  const { platformId } = useAppScope();
  const [globalLoading, setGlobalLoading] = useState(false);

  const { data: platforms = [], refetch: refetchPlatforms } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["finance-stats", platformId],
    queryFn: () => financeApi.getDashboardStats(platformId),
    enabled: !!platformId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: cashRecords = [], refetch: refetchCash } = useQuery({
    queryKey: ["finance-cash-recent", platformId],
    queryFn: () => financeApi.listCashRecords({ platform_id: platformId }),
    enabled: !!platformId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: recentPurchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: ["finance-purchase-recent", platformId],
    queryFn: () =>
      financeApi.listPurchases({ platform_id: platformId, status: 3 }),
    enabled: !!platformId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => {
      refetchStats();
      refetchCash();
      refetchPurchases();
    },
    escape: () => {
      if (auditLogOpen) {
        setAuditLogOpen(false);
      }
    },
  });

  return (
    <div className="leixi-page-container min-h-screen">
      <GlobalLoading loading={globalLoading} />
      <div className="mb-6">
        <Title level={2} className="leixi-text-main m-0">
          财务概览看板
        </Title>
        <Text className="leixi-text-secondary">
          实时监控全平台资金收支、报销进度及采购分摊。符合雷犀 UI 4.0
          高辨识度规范。
        </Text>
      </div>

      <Card
        bordered={false}
        className="shadow-sm mb-6 leixi-filter-border"
        bodyStyle={{ padding: "12px 24px" }}
      >
        <FinanceFilterBar platforms={platforms as any[]} />
      </Card>

      <Row gutter={[24, 24]} className="mb-6">
        <Col span={6}>
          <Card className="shadow-md border-l-4 border-l-slate-900 h-full">
            <Space direction="vertical" size={0}>
              <Text className="leixi-text-secondary font-bold uppercase text-[12px]">
                总报销额 (已打款)
              </Text>
              <div className="flex items-baseline gap-2">
                <Text className="text-3xl leixi-text-main">
                  ￥{(stats?.overview?.reimbursement || 0).toLocaleString()}
                </Text>
                <Tag color="success" icon={<ArrowDownOutlined />}>
                  12%
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-md border-l-4 border-l-slate-900 h-full">
            <Space direction="vertical" size={0}>
              <Text className="leixi-text-secondary font-bold uppercase text-[12px]">
                总采购额 (已完成)
              </Text>
              <div className="flex items-baseline gap-2">
                <Text className="text-3xl leixi-text-main">
                  ￥{(stats?.overview?.purchase || 0).toLocaleString()}
                </Text>
                <Tag color="error" icon={<ArrowUpOutlined />}>
                  5%
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-md border-l-4 border-l-slate-900 h-full">
            <Space direction="vertical" size={0}>
              <Text className="leixi-text-secondary font-bold uppercase text-[12px]">
                现金账户净值
              </Text>
              <div className="flex items-baseline gap-2">
                <Text className="text-3xl leixi-text-main">
                  ￥
                  {(
                    (stats?.overview?.income || 0) -
                    (stats?.overview?.expense || 0)
                  ).toLocaleString()}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-md border-l-4 border-l-red-600 h-full bg-red-50">
            <Space direction="vertical" size={0}>
              <Text className="text-red-600 font-bold uppercase text-[12px]">
                驳回/异常单据
              </Text>
              <div className="flex items-baseline gap-2">
                <Text className="text-3xl text-red-700 font-black">2</Text>
                <Text className="text-red-500 font-bold underline cursor-pointer">
                  立即同步
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col span={10}>
          <Card
            title={
              <Title level={5} className="m-0 leixi-text-main">
                <BarChartOutlined className="mr-2" />
                费用与采购效能
              </Title>
            }
            className="shadow-sm h-full"
            extra={
              <Text className="leixi-text-secondary cursor-pointer font-bold">
                查看所有单据
              </Text>
            }
          >
            <div className="py-4 flex justify-around border-b border-slate-50 mb-4">
              <Space direction="vertical" align="center">
                <Progress
                  type="dashboard"
                  percent={92}
                  strokeColor="#0f172a"
                  strokeWidth={10}
                  width={100}
                />
                <Text className="leixi-text-main text-xs font-bold">
                  报销通过率
                </Text>
              </Space>
              <Space direction="vertical" align="center">
                <Progress
                  type="dashboard"
                  percent={Math.min(
                    100,
                    Math.round(
                      ((stats?.overview?.purchase || 0) /
                        (stats?.overview?.expense || 1)) *
                        100,
                    ),
                  )}
                  strokeColor="#64748b"
                  strokeWidth={10}
                  width={100}
                />
                <Text className="leixi-text-main text-xs font-bold">
                  采购支出比
                </Text>
              </Space>
            </div>

            <div className="px-4 space-y-4">
              <Title level={5} className="text-sm leixi-text-main mb-2">
                采购预算预警 (PRD 2.9.2)
              </Title>
              {recentPurchases.slice(0, 3).map((p: any) => {
                const variance =
                  Number(p.actual_amount || 0) - Number(p.total_amount || 0);
                const isOver = variance > 0;
                return (
                  <div
                    key={p.id}
                    className="p-2 rounded bg-slate-50 border border-slate-100"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <Text className="leixi-text-main font-bold truncate max-w-[150px]">
                        {p.reason}
                      </Text>
                      <Tag
                        color={isOver ? "error" : "success"}
                        className="border-0 font-bold m-0"
                      >
                        {isOver ? "+" : ""}
                        {variance.toLocaleString()}
                      </Tag>
                    </div>
                    <Progress
                      percent={Math.round(
                        (Number(p.actual_amount || 0) /
                          Number(p.total_amount || 1)) *
                          100,
                      )}
                      status={isOver ? "exception" : "success"}
                      size="small"
                      showInfo={false}
                      strokeWidth={6}
                    />
                  </div>
                );
              })}
              {recentPurchases.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  暂无已完成的采购单据
                </div>
              )}
            </div>
          </Card>
        </Col>
        <Col span={14}>
          <Card
            title={
              <Title level={5} className="m-0 leixi-text-main">
                <TransactionOutlined className="mr-2" />
                实时财务收支流转
              </Title>
            }
            className="shadow-sm h-full"
            bodyStyle={{ padding: 0 }}
          >
            <Table
              dataSource={cashRecords}
              pagination={false}
              rowKey="id"
              className="leixi-table"
              columns={[
                {
                  title: "事项",
                  dataIndex: "source",
                  render: (t) => (
                    <Text className="leixi-text-main block truncate max-w-[200px]">
                      {t}
                    </Text>
                  ),
                },
                {
                  title: "变动金额",
                  dataIndex: "amount",
                  render: (v, r: any) => (
                    <Text
                      className={`font-black text-lg ${r.type === 1 ? "text-green-600" : "text-red-600"}`}
                    >
                      {r.type === 1 ? "+" : "-"}￥{Number(v).toLocaleString()}
                    </Text>
                  ),
                },
                {
                  title: "关联单据",
                  dataIndex: "biz_no",
                  render: (t) => (
                    <Text className="leixi-text-secondary font-bold underline cursor-pointer">
                      {t || "-"}
                    </Text>
                  ),
                },
                {
                  title: "发生时间",
                  dataIndex: "create_time",
                  render: (t, r: any) => (
                    <Space size={12} className="w-full justify-between">
                      <Space size={4} className="leixi-text-secondary">
                        <ClockCircleOutlined />
                        <Text className="leixi-text-secondary text-[12px]">
                          {new Date(t).toLocaleString()}
                        </Text>
                      </Space>
                      <Button
                        type="link"
                        size="small"
                        className="font-bold text-slate-500 hover:text-slate-900"
                        onClick={() => {
                          setSelectedLogs(r.modify_log || []);
                          setAuditLogOpen(true);
                        }}
                      >
                        日志
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <AuditLogModal
        open={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
        logs={selectedLogs}
      />
    </div>
  );
}
