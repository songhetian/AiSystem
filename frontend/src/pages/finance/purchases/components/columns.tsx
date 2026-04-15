import { Tag, Typography, Space } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import type { PurchaseRecord } from "@/api/finance";

const { Text } = Typography;

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "审批中", color: "processing" },
  2: { label: "待采购", color: "warning" },
  3: { label: "已完成", color: "success" },
  4: { label: "已驳回", color: "error" },
  5: { label: "已取消", color: "default" },
};

interface ColumnActions {
  onCancel?: (record: PurchaseRecord) => void;
  onComplete?: (record: PurchaseRecord) => void;
}

export const getPurchaseColumns = (
  actions?: ColumnActions,
): ProColumns<PurchaseRecord>[] => [
  {
    title: "采购单号",
    dataIndex: "purchase_no",
    className: "leixi-text-main font-bold",
    width: 160,
  },
  {
    title: "事由",
    dataIndex: "reason",
    className: "leixi-text-main",
    ellipsis: true,
  },
  {
    title: "预算金额",
    dataIndex: "total_amount",
    width: 120,
    render: (val: any) => (
      <Text className="leixi-text-main font-black text-red-600">
        ￥{Number(val).toLocaleString()}
      </Text>
    ),
  },
  {
    title: "实际金额",
    dataIndex: "actual_amount",
    width: 120,
    render: (val: any) =>
      val ? (
        <Text className="font-bold text-slate-700">
          ￥{Number(val).toLocaleString()}
        </Text>
      ) : (
        <Text className="text-slate-400">—</Text>
      ),
  },
  {
    title: "状态",
    dataIndex: "status",
    width: 100,
    render: (val: any) => {
      const cfg = STATUS_MAP[val] || { label: "未知", color: "default" };
      return (
        <Tag color={cfg.color} className="font-bold border-2">
          {cfg.label}
        </Tag>
      );
    },
  },
  {
    title: "提交时间",
    dataIndex: "create_time",
    width: 160,
    className: "leixi-text-secondary text-[12px]",
    render: (t: any) => new Date(t).toLocaleString(),
  },
  {
    title: "操作",
    valueType: "option",
    width: 160,
    render: (_, record) => (
      <Space size={8}>
        {/* 待采购 → 标记完成 */}
        {record.status === 2 && actions?.onComplete && (
          <a
            key="complete"
            className="font-bold text-green-600 hover:text-green-800"
            onClick={() => actions.onComplete!(record)}
          >
            标记完成
          </a>
        )}
        {/* 待采购 → 取消 */}
        {record.status === 2 && actions?.onCancel && (
          <a
            key="cancel"
            className="font-bold text-red-500 hover:text-red-700"
            onClick={() => actions.onCancel!(record)}
          >
            取消采购
          </a>
        )}
      </Space>
    ),
  },
];
