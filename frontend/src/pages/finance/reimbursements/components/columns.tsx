import { Tag, Typography } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import type { ReimbursementRecord } from "@/api/finance";

const { Text } = Typography;

export const getReimbursementColumns = (): ProColumns<ReimbursementRecord>[] => [
  {
    title: "报销单号",
    dataIndex: "reim_no",
    className: "leixi-text-main font-bold",
  },
  {
    title: "申请人",
    dataIndex: "applicantName",
    className: "leixi-text-main",
  },
  {
    title: "金额",
    dataIndex: "amount",
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
    title: "创建时间",
    dataIndex: "create_time",
    className: "leixi-text-secondary",
  },
];
