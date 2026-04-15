import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Segmented, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  serviceApi,
  type ServiceAiOverview,
  type ServiceSessionRecord,
} from "@/api/service";
import { BaseTable } from "@/components/table/BaseTable";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { defaultColumnConfig, getSessionColumns } from "./components/columns";

export default function ServiceSessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [riskView, setRiskView] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("service-sessions-columns", defaultColumnConfig),
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

  // 获取列配置
  const tableColumns = getSessionColumns(columns, {
    onViewDetail: (id: string) => navigate(`/service/sessions/${id}`),
    onReAnalyze: (id: string) => analyzeMutation.mutate(id),
    isAnalyzing: analyzeMutation.isPending,
  });

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-4 justify-between">
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
          <ColumnCustomizer
            columns={columns}
            onChange={setColumns}
            storageKey="service-sessions-columns"
          />
        </div>
      </Card>

      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <BaseTable<ServiceSessionRecord>
          rowKey="id"
          columns={tableColumns}
          dataSource={sessions}
          loading={isLoading}
          scroll={{ y: 600 }} // 启用虚拟滚动支持
        />
      </Card>
    </div>
  );
}
