import { BaseTable } from "@/components/table/BaseTable";
import { LeixiLoading } from "@/components/common/LeixiLoading";
import { financeApi } from "@/api/finance";
import { getPurchaseColumns } from "./columns";

interface PurchaseTableProps {
  keyword: string;
}

export const PurchaseTable = ({ keyword }: PurchaseTableProps) => {
  return (
    <BaseTable
      columns={getPurchaseColumns()}
      request={async (params: Record<string, any>) => {
        const res = await financeApi.listPurchases({ ...params, keyword });
        return { data: res, success: true };
      }}
      loading={{
        indicator: <LeixiLoading tip="正在调取全域采购清单..." />,
      }}
      scroll={{ y: 600 }}
    />
  );
};
