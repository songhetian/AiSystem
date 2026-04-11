import { Tag, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import type { PurchaseRecord } from "@/api/finance";

const { Text } = Typography;

export const getPurchaseColumns = (): ProColumns<PurchaseRecord>[] => [
  {
    title: "采购单号",
    dataIndex: "purchase_no",
    className: "leixi-text-main font-bold",
  },
  {
    title: "申请人",
    dataIndex: "applicantName",
    className: "leixi-text-main",
  },
  {
    title: "总金额",
    dataIndex: "total_amount",
    render: (val: any) => (
      <Text className="leixi-text-main font-black text-red-600">
        ￥{val}
      </Text>
    ),
  },
  {
    title: "状态",
    dataIndex: "status",
    render: (val: any) => <Tag>{val}</Tag>,
  },
  {
    title: "提交时间",
    dataIndex: "create_time",
    className: "leixi-text-secondary",
  },
];
