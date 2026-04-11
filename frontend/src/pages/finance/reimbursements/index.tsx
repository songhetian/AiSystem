import { useState } from "react";
import { Card, Input } from "antd";
import { ReimbursementTable } from "./components/ReimbursementTable";

export default function ReimbursementsPage() {
  const [keyword, setKeyword] = useState("");

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "16px 24px" }}>
        <Input.Search
          placeholder="搜索报销单号..."
          onSearch={setKeyword}
          style={{ width: 300, height: "44px" }}
          className="leixi-filter-border"
        />
      </Card>
      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <ReimbursementTable keyword={keyword} />
      </Card>
    </div>
  );
}
