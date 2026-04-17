import { Card, Input, Button, Space, message } from "antd";
import { useState, useRef } from "react";
import { PurchaseTable } from "./components/PurchaseTable";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { downloadCSV } from "@/utils/exportUtils";
import { financeApi } from "@/api/finance";
import { useAppScope } from "@/hooks/useAppScope";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { handleExportWithProgress } from "@/utils/ui-helpers";
import dayjs from "dayjs";

export default function PurchasesPage() {
  const [keyword, setKeyword] = useState("");
  const searchInputRef = useRef<any>(null);

  const { platformId } = useAppScope();

  // 搜索防抖
  const debouncedKeyword = useDebounce(keyword, 500);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+f": () => searchInputRef.current?.focus(),
  });

  const handleExport = async () => {
    await handleExportWithProgress(
      async () => {
        const data = await financeApi.listPurchases({
          platform_id: platformId,
          keyword: debouncedKeyword,
        });
        downloadCSV(data, `采购清单_${dayjs().format("YYYYMMDD")}`, [
          { label: "采购单号", key: "purchase_no" },
          { label: "采购原因", key: "reason" },
          { label: "总金额", key: "total_amount" },
          { label: "实际金额", key: "actual_amount" },
          { label: "状态", key: "status" },
          { label: "提交时间", key: "create_time" },
        ]);
      },
      `采购清单_${dayjs().format("YYYYMMDD")}.csv`,
    );
  };

  return (
    <div className="leixi-page-container">
      <div className="mb-4">
        <h1 className="leixi-text-main text-2xl mb-1 font-black">
          采购管理中心
        </h1>
        <p className="leixi-text-secondary">
          追踪物资采购全生命周期，管控预算执行进度。
        </p>
      </div>

      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "20px" }}>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-grow min-w-[300px]">
            <Input.Search
              ref={searchInputRef}
              placeholder="搜索采购单号、物品明细、事由... (Ctrl+F)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={setKeyword}
              style={{ height: "44px" }}
              className="leixi-filter-height"
              allowClear
            />
          </div>

          <Space.Compact>
            <Button
              style={{ height: "44px", borderColor: "#64748b" }}
              className="font-bold"
            >
              今日
            </Button>
            <Button
              style={{ height: "44px", borderColor: "#64748b" }}
              className="font-bold"
            >
              本周
            </Button>
            <Button
              style={{ height: "44px", borderColor: "#64748b" }}
              className="font-bold"
            >
              本月
            </Button>
          </Space.Compact>

          <Button
            icon={<DownloadOutlined />}
            style={{ height: "44px", borderColor: "#64748b" }}
            className="font-bold border-2 text-slate-900"
            onClick={handleExport}
          >
            导出清单
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: "44px" }}
            className="font-bold shadow-md"
          >
            发起采购
          </Button>
        </div>
      </Card>
      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <PurchaseTable keyword={debouncedKeyword} />
      </Card>
    </div>
  );
}
