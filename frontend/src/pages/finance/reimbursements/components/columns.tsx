import { Tag, Typography, Space } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import type { ReimbursementRecord } from "@/api/finance";

const { Text } = Typography;

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "审批中", color: "processing" },
  2: { label: "待打款", color: "warning" },
  3: { label: "已打款", color: "success" },
  4: { label: "已驳回", color: "error" },
  5: { label: "已撤回", color: "default" },
};

interface ColumnActions {
  onWithdraw?: (record: ReimbursementRecord) => void;
  onPay?: (record: ReimbursementRecord) => void;
  currentUserId?: string;
}

export const getReimbursementColumns = (
  actions?: ColumnActions,
): ProColumns<ReimbursementRecord>[] => [
  {
    title: "报销单号",
    dataIndex: "reim_no",
    className: "leixi-text-main font-bold",
    width: 160,
  },
  {
    title: "申请人",
    dataIndex: "applicant_id",
    className: "leixi-text-main",
    width: 100,
    render: (_, record) => record.applicantName || record.applicant_id,
  },
  {
    title: "事由",
    dataIndex: "reason",
    ellipsis: true,
    className: "leixi-text-main",
  },
  {
    title: "金额",
    dataIndex: "amount",
    width: 120,
    render: (val: any) => (
      <Text className="leixi-text-main font-black text-red-600">
        ￥{Number(val).toLocaleString()}
      </Text>
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
    width: 140,
    render: (_, record) => (
      <Space size={8}>
        {/* 待打款 → 财务打款 */}
        {record.status === 2 && actions?.onPay && (
          <a
            key="pay"
            className="font-bold text-blue-600 hover:text-blue-800"
            onClick={() => actions.onPay!(record)}
          >
            确认打款
          </a>
        )}
        {/* 审批中 + 本人 → 撤回 */}
        {record.status === 1 && actions?.onWithdraw && (
          <a
            key="withdraw"
            className="font-bold text-orange-500 hover:text-orange-700"
            onClick={() => actions.onWithdraw!(record)}
          >
            撤回
          </a>
        )}
      </Space>
    ),
  },
];
