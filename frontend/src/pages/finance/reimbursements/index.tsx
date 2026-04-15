import { useState } from "react";
import { Card, Input, Tabs, Button, Space, DatePicker } from "antd";
import { ReimbursementTable } from "./components/ReimbursementTable";
import { downloadCSV } from "@/utils/exportUtils";
import { DownloadOutlined, ExportOutlined } from "@ant-design/icons";
import { financeApi } from "@/api/finance";
import { useAppScope } from "@/hooks/useAppScope";
import { useQuery } from "@tanstack/react-query";

const { RangePicker } = DatePicker;

export default function ReimbursementsPage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<any>(null);

  const { platformId } = useAppScope();
  const handleQuickDate = (type: string) => {
    console.log("Quick date:", type);
  };

  const handleExport = async () => {
    const data = await financeApi.listReimbursements({ platform_id: platformId, keyword, status: status === 'all' ? undefined : status });
    downloadCSV(data, '报销记录清单', [
      { label: '报销单号', key: 'reim_no' },
      { label: '申请原因', key: 'reason' },
      { label: '金额', key: 'amount' },
      { label: '状态', key: 'status' },
      { label: '提交时间', key: 'create_time' },
    ]);
  };

  return (
    <div className="leixi-page-container">
      <div className="mb-4">
        <h1 className="leixi-text-main text-2xl mb-2">财务报销中心</h1>
        <p className="leixi-text-secondary">管理并审核全平台的报销申请，实现自动化打款与账务同步。</p>
      </div>

      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "20px" }}>
        <div className="flex flex-wrap gap-4 items-center">
          {/* 单行全铺满、自适应比例 (flex-grow) 布局 */}
          <div className="flex-grow min-w-[300px]">
            <Input.Search
              placeholder="搜索报销单号、申请人、摘要关键词..."
              onSearch={setKeyword}
              style={{ height: "44px" }}
              className="leixi-filter-height"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="leixi-text-secondary font-bold">时间范围:</span>
            <RangePicker style={{ height: "44px" }} />
          </div>

          <div className="flex items-center">
            {/* 快捷日期按钮组，高度统一为 44px，边框严格锁定为 slate-500 */}
            <Space.Compact>
              <Button 
                style={{ height: "44px", borderColor: "#64748b" }} 
                onClick={() => handleQuickDate("today")}
                className="hover:leixi-text-main"
              >
                今日
              </Button>
              <Button 
                style={{ height: "44px", borderColor: "#64748b" }} 
                onClick={() => handleQuickDate("near7")}
              >
                近7天
              </Button>
              <Button 
                style={{ height: "44px", borderColor: "#64748b" }} 
                onClick={() => handleQuickDate("near30")}
              >
                近30天
              </Button>
            </Space.Compact>
          </div>

          <Button 
            icon={<DownloadOutlined />} 
            style={{ height: "44px", borderColor: "#64748b" }} 
            className="font-bold text-slate-900 border-2"
            onClick={handleExport}
          >
            导出数据
          </Button>
        </div>
      </Card>

      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={status}
          onChange={setStatus}
          type="line"
          tabBarStyle={{ paddingLeft: 24, marginBottom: 0 }}
          items={[
            { label: "全部记录", key: "all" },
            { label: "待审批", key: "1" },
            { label: "待打款", key: "2" },
            { label: "已完成", key: "3" },
            { label: "已驳回", key: "4" },
          ]}
        />
        <div className="p-4">
          <ReimbursementTable keyword={keyword} status={status === "all" ? undefined : status} />
        </div>
      </Card>
    </div>
  );
}
