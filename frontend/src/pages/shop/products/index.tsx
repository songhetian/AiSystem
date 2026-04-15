import { useState } from "react";
import { useQuery } from "@tantml:query";
import {
  Badge,
  Card,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Tag,
  Tabs,
  Typography,
} from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { EyeOutlined, SyncOutlined } from "@ant-design/icons";
import { BaseTable } from "@/components/table/BaseTable";
import { shopApi } from "@/api/shop";
import { systemApi } from "@/api/system";
import { ProductSortList } from "./components/ProductSortList";

const { Text } = Typography;

// 商品数据来自第三方平台 API 同步，只读展示
export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [keyword, setKeyword] = useState("");
  const [platformId, setPlatformId] = useState<string>();
  const [sortPlatformId, setSortPlatformId] = useState<string>();
  const [status, setStatus] = useState<number>();
  const [detail, setDetail] = useState<any>(null);

  const { data: platforms = [] } = useQuery({
    queryKey: ["system-platforms"],
    queryFn: systemApi.listPlatforms,
  });

  const { data: allProducts = [], refetch: refetchProducts } = useQuery({
    queryKey: ["shop-products-all", sortPlatformId],
    queryFn: async () => {
      const res = await shopApi.listProducts({
        platform_id: sortPlatformId,
      });
      return res;
    },
    enabled: activeTab === "sort",
  });

  const handleSaveSort = async (items: Array<{ id: string; sort: number }>) => {
    await shopApi.updateProductSort(items);
    await refetchProducts();
  };

  const columns: ProColumns<any>[] = [
    {
      title: "商品名称",
      dataIndex: "name",
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text className="font-bold text-slate-900">{name}</Text>
          <Text className="text-xs text-slate-400">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: "分类",
      dataIndex: "category_name",
      width: 120,
      render: (v: string) => (v ? <Tag>{v}</Tag> : "-"),
    },
    {
      title: "所属平台",
      dataIndex: "platform_name",
      width: 120,
      render: (v: string) =>
        v ? <Text className="text-slate-600 font-bold">{v}</Text> : "-",
    },
    {
      title: "SKU 数",
      dataIndex: "skus",
      width: 80,
      render: (skus: any[]) => (
        <Badge count={skus?.length ?? 0} color="#64748b" showZero />
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (val: number) => (
        <Tag color={val === 1 ? "success" : "default"}>
          {val === 1 ? "上架" : "下架"}
        </Tag>
      ),
    },
    {
      title: "同步时间",
      dataIndex: "update_time",
      width: 160,
      render: (t: string) => (
        <Text className="text-xs text-slate-400">
          {t ? new Date(t).toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      width: 80,
      render: (_: any, record: any) => (
        <a
          className="font-bold text-blue-600 flex items-center gap-1"
          onClick={() => setDetail(record)}
        >
          <EyeOutlined /> 详情
        </a>
      ),
    },
  ];

  return (
    <div className="leixi-page-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: "商品列表",
            children: (
              <>
                {/* 说明：商品数据来自第三方平台 API 同步，不支持手动创建 */}
                <Card
                  className="shadow-sm mb-4"
                  bodyStyle={{ padding: "16px 24px" }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Input.Search
                      placeholder="搜索商品名称/编码"
                      onSearch={setKeyword}
                      allowClear
                      style={{ width: 280, height: 44 }}
                    />
                    <Select
                      allowClear
                      placeholder="所属平台"
                      style={{ width: 160, height: 44 }}
                      value={platformId}
                      onChange={setPlatformId}
                      options={platforms.map((p: any) => ({
                        label: p.name,
                        value: p.id,
                      }))}
                    />
                    <Select
                      allowClear
                      placeholder="商品状态"
                      style={{ width: 130, height: 44 }}
                      value={status}
                      onChange={setStatus}
                      options={[
                        { label: "上架", value: 1 },
                        { label: "下架", value: 0 },
                      ]}
                    />
                    <div className="ml-auto flex items-center gap-2 text-slate-400 text-xs">
                      <SyncOutlined />
                      <span>数据来自第三方平台 API 同步</span>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
                  <BaseTable
                    columns={columns}
                    request={async (params) => {
                      const res = await shopApi.listProducts({
                        ...params,
                        keyword: keyword || undefined,
                        platform_id: platformId,
                        status,
                      });
                      return { data: res, success: true };
                    }}
                    scroll={{ y: 600 }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "sort",
            label: "商品排序",
            children: (
              <ProductSortList
                products={allProducts}
                onSave={handleSaveSort}
                platformId={sortPlatformId}
                onPlatformChange={setSortPlatformId}
                platforms={platforms}
              />
            ),
          },
        ]}
      />

      {/* 商品详情抽屉 */}
      <Drawer
        title={
          <Space>
            <Text className="font-black text-slate-900">{detail?.name}</Text>
            <Tag color={detail?.status === 1 ? "success" : "default"}>
              {detail?.status === 1 ? "上架" : "下架"}
            </Tag>
          </Space>
        }
        open={!!detail}
        onClose={() => setDetail(null)}
        width={600}
      >
        {detail && (
          <Space direction="vertical" style={{ width: "100%" }} size={20}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="商品名称" span={2}>
                {detail.name}
              </Descriptions.Item>
              <Descriptions.Item label="商品编码">
                {detail.code}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                {detail.category_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="所属平台">
                {detail.platform_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="所属部门">
                {detail.department_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {detail.description || "-"}
              </Descriptions.Item>
            </Descriptions>

            {/* SKU 列表 */}
            {detail.skus?.length > 0 && (
              <div>
                <Text className="font-bold text-slate-700 block mb-3">
                  SKU 规格
                </Text>
                <div className="space-y-2">
                  {detail.skus.map((sku: any) => (
                    <div
                      key={sku.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <Space direction="vertical" size={0}>
                        <Text className="font-bold text-slate-900">
                          {sku.sku_code}
                        </Text>
                        {sku.spec_data && (
                          <Text className="text-xs text-slate-400">
                            {typeof sku.spec_data === "object"
                              ? Object.entries(sku.spec_data)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" / ")
                              : sku.spec_data}
                          </Text>
                        )}
                      </Space>
                      <Space size={16}>
                        <Space direction="vertical" size={0} align="center">
                          <Text className="text-xs text-slate-400">价格</Text>
                          <Text className="font-black text-red-600">
                            ￥{Number(sku.price).toFixed(2)}
                          </Text>
                        </Space>
                        <Space direction="vertical" size={0} align="center">
                          <Text className="text-xs text-slate-400">库存</Text>
                          <Text
                            className={`font-bold ${sku.stock <= sku.warn_stock ? "text-orange-500" : "text-slate-900"}`}
                          >
                            {sku.stock}
                          </Text>
                        </Space>
                        <Tag color={sku.status === 1 ? "success" : "default"}>
                          {sku.status === 1 ? "启用" : "停用"}
                        </Tag>
                      </Space>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
