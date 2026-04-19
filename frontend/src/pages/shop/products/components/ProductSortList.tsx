import { useState, useEffect } from "react";
import { Button, Card, Space, Typography, message, Select, Empty } from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import type { ProductRecord } from "@/api/shop";

const { Text } = Typography;

interface ProductSortListProps {
  products: ProductRecord[];
  onSave: (items: Array<{ id: string; sort: number }>) => Promise<void>;
  platformId?: string;
  onPlatformChange?: (value: string | undefined) => void;
  platforms?: Array<{ id: string; name: string }>;
}

export const ProductSortList = ({
  products,
  onSave,
  platformId,
  onPlatformChange,
  platforms = [],
}: ProductSortListProps) => {
  const [sortedProducts, setSortedProducts] = useState<ProductRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSortedProducts(products);
    setHasChanges(false);
  }, [products]);

  const handleDragEnd = (newItems: ProductRecord[]) => {
    setSortedProducts(newItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const items = sortedProducts.map((product, index) => ({
      id: product.id,
      sort: index,
    }));

    setSaving(true);
    try {
      await onSave(items);
      message.success("商品排序已保存");
      setHasChanges(false);
    } catch (error) {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSortedProducts(products);
    setHasChanges(false);
    message.info("已恢复原始排序");
  };

  const renderProduct = (product: ProductRecord, index: number) => (
    <Card
      className="mb-3 cursor-move hover:shadow-md transition-shadow"
      bodyStyle={{ padding: "16px" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
            <Text className="text-lg font-bold text-blue-600">{index + 1}</Text>
          </div>
          <div className="flex-1">
            <Text strong className="block text-slate-900">
              {product.name}
            </Text>
            <Space size={8} className="mt-1">
              <Text className="text-xs text-slate-400">{product.code}</Text>
            </Space>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {product.skus && product.skus.length > 0 && (
            <div className="text-center">
              <Text className="text-xs text-slate-400 block">SKU数</Text>
              <Text className="font-bold text-slate-700">
                {product.skus.length}
              </Text>
            </div>
          )}
          <div className="text-center">
            <Text className="text-xs text-slate-400 block">状态</Text>
            <Text
              className={
                product.status === 1 ? "text-green-600" : "text-slate-400"
              }
            >
              {product.status === 1 ? "上架" : "下架"}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      {/* 筛选和操作栏 */}
      <Card className="mb-4 shadow-sm" bodyStyle={{ padding: "16px 24px" }}>
        <div className="flex items-center justify-between">
          <Space size={16}>
            {platforms.length > 0 && (
              <Select
                allowClear
                placeholder="选择平台"
                style={{ width: 200 }}
                value={platformId}
                onChange={onPlatformChange}
                options={platforms.map((p) => ({
                  label: p.name,
                  value: p.id,
                }))}
              />
            )}
            <Text type="secondary" className="text-sm">
              共 {sortedProducts.length} 个商品
            </Text>
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              重置排序
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              保存排序
            </Button>
          </Space>
        </div>
      </Card>

      {/* 未保存提示 */}
      {hasChanges && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            ⚠️ 您有未保存的更改，请点击"保存排序"按钮保存
          </p>
        </div>
      )}

      {/* 拖拽排序列表 */}
      {sortedProducts.length > 0 ? (
        <Card className="shadow-sm" bodyStyle={{ padding: "24px" }}>
          <div className="mb-4">
            <Text strong className="text-lg">
              商品排序
            </Text>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">💡 提示：</p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                <li>• 拖拽商品卡片可调整展示顺序</li>
                <li>• 排序号越小，商品展示越靠前</li>
                <li>• 修改后需点击"保存排序"才会生效</li>
                <li>• 排序仅影响前端展示顺序，不影响商品数据</li>
              </ul>
            </div>
          </div>

          <BaseDrag
            items={sortedProducts}
            getItemId={(item) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderProduct}
            direction="vertical"
          />
        </Card>
      ) : (
        <Card className="shadow-sm">
          <Empty description="暂无商品数据" />
        </Card>
      )}
    </div>
  );
};
