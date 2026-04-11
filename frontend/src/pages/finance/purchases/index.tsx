import { useState } from "react";
import { Card, Input } from "antd";
import { PurchaseTable } from "./components/PurchaseTable";

export default function PurchasesPage() {
  const [keyword, setKeyword] = useState("");

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "16px 24px" }}>
        <Input.Search
          placeholder="搜索采购单号..."
          onSearch={setKeyword}
          style={{ width: 300, height: "44px" }}
          className="leixi-filter-border"
        />
      </Card>
      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <PurchaseTable keyword={keyword} />
      </Card>
    </div>
  );
}
