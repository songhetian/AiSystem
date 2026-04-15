import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Space,
  Typography,
  message,
  Select,
  Empty,
  Tag,
} from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import type {
  ShopRecord,
  PlatformRecord,
  DepartmentRecord,
} from "@/api/system";

const { Text } = Typography;

interface ShopSortListProps {
  shops: ShopRecord[];
  platforms: PlatformRecord[];
  departments: DepartmentRecord[];
  onSave: (items: Array<{ id: string; sort: number }>) => Promise<void>;
  platformId?: string;
  departmentId?: string;
  onPlatformChange?: (value: string | undefined) => void;
  onDepartmentChange?: (value: string | undefined) => void;
}

export const ShopSortList = ({
  shops,
  platforms,
  departments,
  onSave,
  platformId,
  departmentId,
  onPlatformChange,
  onDepartmentChange,
}: ShopSortListProps) => {
  const [sortedShops, setSortedShops] = useState<ShopRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSortedShops(shops);
    setHasChanges(false);
  }, [shops]);

  const handleDragEnd = (newItems: ShopRecord[]) => {
    setSortedShops(newItems);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const items = sortedShops.map((shop, index) => ({
      id: shop.id,
      sort: index,
    }));

    setSaving(true);
    try {
      await onSave(items);
      message.success("店铺排序已保存");
      setHasChanges(false);
    } catch (error) {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSortedShops(shops);
    setHasChanges(false);
    message.info("已恢复原始排序");
  };

  const filteredDepartments = platformId
    ? departments.filter((d) => d.platform_id === platformId)
    : departments;

  const renderShop = (shop: ShopRecord, index: number) => {
    const platform = platforms.find((p) => p.id === shop.platform_id);
    const department = departments.find((d) => d.id === shop.department_id);

    return (
      <Card
        className="mb-3 cursor-move hover:shadow-md transition-shadow"
        bodyStyle={{ padding: "16px" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Text className="text-lg font-bold text-blue-600">
                {index + 1}
              </Text>
            </div>
            <div className="flex-1">
              <Text strong className="block text-slate-900">
                {shop.name}
              </Text>
              <Space size={8} className="mt-1">
                <Text className="text-xs text-slate-400">{shop.code}</Text>
                {platform && (
                  <Tag color="blue" className="text-xs">
                    {platform.name}
                  </Tag>
                )}
                {department && (
                  <Tag color="green" className="text-xs">
                    {department.name}
                  </Tag>
                )}
              </Space>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <Text className="text-xs text-slate-400 block">类型</Text>
              <Tag color={shop.type === 1 ? "processing" : "warning"}>
                {shop.type === 1 ? "线上" : "线下"}
              </Tag>
            </div>
            <div className="text-center">
              <Text className="text-xs text-slate-400 block">状态</Text>
              <Tag color={shop.status === 1 ? "success" : "default"}>
                {shop.status === 1 ? "启用" : "禁用"}
              </Tag>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* 筛选和操作栏 */}
      <Card className="mb-4 shadow-sm" bodyStyle={{ padding: "16px 24px" }}>
        <div className="flex items-center justify-between">
          <Space size={16}>
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
            <Select
              allowClear
              placeholder="选择部门"
              style={{ width: 200 }}
              value={departmentId}
              onChange={onDepartmentChange}
              options={filteredDepartments.map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />
            <Text type="secondary" className="text-sm">
              共 {sortedShops.length} 个店铺
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
      {sortedShops.length > 0 ? (
        <Card className="shadow-sm" bodyStyle={{ padding: "24px" }}>
          <div className="mb-4">
            <Text strong className="text-lg">
              店铺排序
            </Text>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">💡 提示：</p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                <li>• 拖拽店铺卡片可调整展示顺序</li>
                <li>• 排序号越小，店铺展示越靠前</li>
                <li>• 修改后需点击"保存排序"才会生效</li>
                <li>• 可按平台和部门筛选店铺</li>
              </ul>
            </div>
          </div>

          <BaseDrag
            items={sortedShops}
            getItemId={(item) => item.id}
            onDragEnd={handleDragEnd}
            renderItem={renderShop}
            direction="vertical"
          />
        </Card>
      ) : (
        <Card className="shadow-sm">
          <Empty description="暂无店铺数据，请先选择平台或部门" />
        </Card>
      )}
    </div>
  );
};
