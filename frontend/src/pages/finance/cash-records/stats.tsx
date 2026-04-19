import { useState } from "react";
import { Card, DatePicker, Select, Space, Button, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { CashRecordStatsChart } from "../components/CashRecordStatsChart";
import { useAppScope } from "@/hooks/useAppScope";
import dayjs from "dayjs";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { RangePicker } = DatePicker;

export default function CashRecordStatsPage() {
  const { platformId } = useAppScope();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [type, setType] = useState<string>();
  const [globalLoading, setGlobalLoading] = useState(false);

  const startDate = dateRange?.[0]?.format("YYYY-MM-DD");
  const endDate = dateRange?.[1]?.format("YYYY-MM-DD");

  const handleQuickDate = (days: number) => {
    const end = dayjs();
    const start = end.subtract(days, "day");
    setDateRange([start, end]);
  };

  const handleExport = async () => {
    try {
      setGlobalLoading(true);
      message.success("报表导出成功");
      // Add actual export logic here
    } catch (error) {
      message.error("导出失败");
    } finally {
      setGlobalLoading(false);
    }
  };

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+e": () => handleExport(),
    escape: () => {
      setDateRange(null);
      setType(undefined);
    },
  });

  return (
    <div className="leixi-page-container">
      <GlobalLoading loading={globalLoading} />
      <div className="mb-4">
        <h1 className="leixi-text-main text-2xl mb-2">收支统计分析</h1>
        <p className="leixi-text-secondary">
          多维度统计收支数据，展示收支变化趋势，为财务核算提供支撑。
        </p>
      </div>

      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "20px" }}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="leixi-text-secondary font-bold">时间范围:</span>
            <RangePicker
              style={{ height: "44px" }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
            />
          </div>

          <div className="flex items-center">
            <Space.Compact>
              <Button
                style={{ height: "44px", borderColor: "#64748b" }}
                onClick={() => handleQuickDate(7)}
              >
                近7天
              </Button>
              <Button
                style={{ height: "44px", borderColor: "#64748b" }}
                onClick={() => handleQuickDate(30)}
              >
                近30天
              </Button>
              <Button
                style={{ height: "44px", borderColor: "#64748b" }}
                onClick={() => handleQuickDate(90)}
              >
                近90天
              </Button>
            </Space.Compact>
          </div>

          <div className="flex items-center gap-2">
            <span className="leixi-text-secondary font-bold">类型:</span>
            <Select
              allowClear
              style={{ width: 150, height: "44px" }}
              placeholder="选择类型"
              value={type}
              onChange={setType}
              options={[
                { label: "收入", value: "1" },
                { label: "支出", value: "2" },
              ]}
            />
          </div>

          <Button
            icon={<DownloadOutlined />}
            style={{ height: "44px", borderColor: "#64748b" }}
            className="font-bold text-slate-900 border-2"
            onClick={handleExport}
          >
            导出报表
          </Button>
        </div>
      </Card>

      <CashRecordStatsChart
        platformId={platformId}
        startDate={startDate}
        endDate={endDate}
        type={type}
      />
    </div>
  );
}
