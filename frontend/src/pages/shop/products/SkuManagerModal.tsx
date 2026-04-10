import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form, Input, InputNumber, Button, Space, Card, Typography, Select, Divider } from 'antd';
import { MenuOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { BaseModal } from '@/components/common/BaseModal';
import { ProductRecord, SkuRecord } from '@/api/shop';

const { Text } = Typography;

interface SkuItemProps {
  id: string;
  index: number;
  onRemove: (id: string) => void;
  shops: any[];
}

const SortableSkuItem = ({ id, index, onRemove, shops }: SkuItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 8,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card size="small" className="shadow-sm border-slate-300">
        <div className="flex items-start gap-4">
          {/* 拖拽手柄 */}
          <div {...attributes} {...listeners} className="mt-2 cursor-grab text-slate-400">
            <MenuOutlined />
          </div>

          <div className="flex-grow grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <Form.Item name={[index, 'sku_code']} label="SKU编码" rules={[{ required: true }]} noStyle>
                <Input placeholder="唯一编码" className="font-bold" />
              </Form.Item>
            </div>
            <div className="col-span-3">
              <Form.Item name={[index, 'spec_data']} label="规格描述" noStyle>
                <Input placeholder="如：黑色/XL" />
              </Form.Item>
            </div>
            <div className="col-span-2">
              <Form.Item name={[index, 'price']} label="价格" rules={[{ required: true }]} noStyle>
                <InputNumber placeholder="价格" prefix="￥" className="w-full font-black text-slate-900" min={0} />
              </Form.Item>
            </div>
            <div className="col-span-2">
              <Form.Item name={[index, 'stock']} label="库存" rules={[{ required: true }]} noStyle>
                <InputNumber placeholder="库存" className="w-full font-bold" min={0} />
              </Form.Item>
            </div>
            <div className="col-span-2">
              <Form.Item name={[index, 'shop_id']} label="销售店铺" rules={[{ required: true }]} noStyle>
                <Select placeholder="选择店铺" options={shops.map(s => ({ label: s.name, value: s.id }))} />
              </Form.Item>
            </div>
          </div>

          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(id)} />
        </div>
      </Card>
    </div>
  );
};

interface SkuManagerModalProps {
  open: boolean;
  product: ProductRecord | null;
  onCancel: () => void;
  onSave: (skus: any[]) => void;
  confirmLoading?: boolean;
  shops: any[];
}

export function SkuManagerModal({ open, product, onCancel, onSave, confirmLoading, shops }: SkuManagerModalProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && product) {
      const initialSkus = product.skus || [];
      const ids = initialSkus.map(s => s.id || Math.random().toString());
      setItems(ids);
      
      const formData = initialSkus.reduce((acc: any, sku, idx) => {
        acc[idx] = { ...sku, spec_data: typeof sku.spec_data === 'string' ? sku.spec_data : JSON.stringify(sku.spec_data) };
        return acc;
      }, {});
      form.setFieldsValue(formData);
    } else {
      setItems([]);
      form.resetFields();
    }
  }, [open, product, form]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const addItem = () => {
    const newId = Math.random().toString();
    setItems([...items, newId]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item !== id));
  };

  const handleFinish = () => {
    const values = form.getFieldsValue();
    const sortedSkus = items.map((id, index) => {
      // 这里的 values 是以 index 为 key 的对象
      const originalIndex = items.indexOf(id);
      return {
        ...values[originalIndex],
        sort: index
      };
    });
    onSave(sortedSkus);
  };

  return (
    <BaseModal
      open={open}
      title={
        <Space>
          <Text className="font-black text-lg text-slate-900">规格管理:</Text>
          <Text className="text-slate-500">{product?.name}</Text>
        </Space>
      }
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      width={1000}
    >
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Text className="text-slate-600 font-bold italic text-xs">* 提示：拖拽左侧手柄可调整显示顺序</Text>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} className="font-bold">
            添加规格 SKU
          </Button>
        </div>
        <Divider className="my-2" />
      </div>

      <Form form={form} onFinish={handleFinish}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="max-h-[500px] overflow-y-auto px-1">
              {items.map((id, index) => (
                <SortableSkuItem key={id} id={id} index={index} onRemove={removeItem} shops={shops} />
              ))}
              {items.length === 0 && (
                <div className="py-10 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Text type="secondary">暂无规格信息，点击上方按钮添加</Text>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </Form>
    </BaseModal>
  );
}
