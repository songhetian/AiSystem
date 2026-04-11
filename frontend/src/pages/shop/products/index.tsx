import { useState } from "react";
import { Card, Input, Button, Typography, Tag } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { BaseTable } from "@/components/table/BaseTable";
import { shopApi } from "@/api/shop";
import { LeixiLoading } from "@/components/common/LeixiLoading";

const { Text } = Typography;

export default function ProductsPage() {
  const [keyword, setKeyword] = useState("");

  const columns: ProColumns<object>[] = [
    {
      title: "商品名称",
      dataIndex: "name",
      className: "leixi-text-main font-bold",
    },
    { title: "商品编码", dataIndex: "code", className: "leixi-text-main" },
    {
      title: "分类",
      dataIndex: "category_name",
      className: "leixi-text-secondary",
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (val: unknown) => (
        <Tag color={(val as number) === 1 ? "green" : "red"}>
          {(val as number) === 1 ? "上架" : "下架"}
        </Tag>
      ),
    },
  ];

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-4">
          <Input.Search
            placeholder="搜索商品..."
            onSearch={setKeyword}
            style={{ width: 300, height: "44px" }}
            className="leixi-filter-border"
          />
          <Button type="primary" size="large">
            新建商品
          </Button>
        </div>
      </Card>
      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <BaseTable
          columns={columns}
          request={async (params) => {
            const res = await shopApi.listProducts({ ...params, keyword });
            return { data: res, success: true };
          }}
          loading={{
            indicator: <LeixiLoading tip="正在同步实时库存库存..." />,
          }}
          scroll={{ y: 600 }}
        />
      </Card>
    </div>
  );
}
