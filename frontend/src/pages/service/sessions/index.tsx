import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Input,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  serviceApi,
  type ServiceAiOverview,
  type ServiceSessionRecord,
} from "@/api/service";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";

const { Text } = Typography;

export default function ServiceSessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [riskView, setRiskView] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );

  const queryParams = useMemo(
    () => ({
      keyword: keyword || undefined,
      risk_level: riskView === "all" ? undefined : riskView,
    }),
    [keyword, riskView],
  );

  const { data: sessions = [], isLoading } = useQuery<ServiceSessionRecord[]>({
    queryKey: ["service-sessions", queryParams],
    queryFn: () => serviceApi.listSessions(queryParams),
  });

  const { data: overview } = useQuery<ServiceAiOverview>({
    queryKey: ["service-ai-overview", queryParams],
    queryFn: () => serviceApi.getAiOverview(queryParams),
  });

  const analyzeMutation = useMutation({
    mutationFn: (id: string) =>
      serviceApi.analyzeSession(id, { mode: "manual" }),
    onSuccess: async () => {
      message.success("AI 质检已重新分析");
      await queryClient.invalidateQueries({ queryKey: ["service-sessions"] });
    },
  });

  const columns: ProColumns<ServiceSessionRecord>[] = [
    {
      title: "会话编号",
      dataIndex: "session_no",
      width: 180,
      className: "leixi-text-main",
    },
    {
      title: "客户 / 客服",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text className="leixi-text-main font-bold">
            {record.customer_nickname || "匿名客户"}
          </Text>
          <Text className="leixi-text-secondary text-xs">
            {record.agent_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "AI 质检",
      render: (_, record) => {
        const analysis = record.latest_analysis;
        if (!analysis) return <Tag>未分析</Tag>;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={analysis.quality_passed ? "success" : "error"}>
              {analysis.quality_passed ? "合格" : "不合格"}
            </Tag>
            <Text className="leixi-text-secondary text-xs">
              分 {analysis.quality_score}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (val) => <Tag>{val}</Tag>,
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => navigate(`/service/sessions/${record.id}`)}
          >
            详情
          </Button>
          <Permission code="service:quality:analyze">
            <Button
              type="link"
              loading={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate(record.id)}
            >
              重分析
            </Button>
          </Permission>
        </Space>
      ),
    },
  ];

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-4">
          <Input.Search
            placeholder="搜索会话..."
            onSearch={setKeyword}
            style={{ width: 300, height: "44px" }}
            className="leixi-filter-border"
          />
          <Segmented
            value={riskView}
            onChange={setRiskView as any}
            options={["all", "high", "medium", "low"]}
            className="leixi-filter-border"
          />
        </div>
      </Card>

      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <BaseTable<ServiceSessionRecord>
          rowKey="id"
          columns={columns}
          dataSource={sessions}
          loading={isLoading}
          scroll={{ y: 600 }} // 启用虚拟滚动支持
        />
      </Card>
    </div>
  );
}
