import { useMemo, useState, useRef } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

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
  const searchInputRef = useRef<any>(null);

  // 搜索防抖
  const debouncedKeyword = useDebounce(keyword, 500);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      queryClient.invalidateQueries({ queryKey: ["service-sessions"] });
      message.success("已刷新");
    },
  });

  const queryParams = useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      risk_level: riskView === "all" ? undefined : riskView,
    }),
    [debouncedKeyword, riskView],
  );

  const { data: sessions = [], isLoading } = useQuery<ServiceSessionRecord[]>({
    queryKey: ["service-sessions", queryParams],
    queryFn: () => serviceApi.listSessions(queryParams),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
    onError: (error: any) => {
      message.error(error?.message || "分析失败");
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
              ref={searchInputRef}
              placeholder="搜索会话..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={setKeyword}
              style={{ width: 300, height: "44px" }}
              className="leixi-filter-border"
              allowClear
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
        <GlobalLoading loading={isLoading}>
          <BaseTable<ServiceSessionRecord>
            rowKey="id"
            columns={tableColumns}
            dataSource={sessions}
            loading={isLoading}
            scroll={{ y: 600 }} // 启用虚拟滚动支持
          />
        </GlobalLoading>
      </Card>
    </div>
  );
}
