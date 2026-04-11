import { BaseTable } from "@/components/table/BaseTable";
import { financeApi } from "@/api/finance";
import { getReimbursementColumns } from "./columns";

interface ReimbursementTableProps {
  keyword: string;
}

export const ReimbursementTable = ({ keyword }: ReimbursementTableProps) => {
  return (
    <BaseTable
      columns={getReimbursementColumns()}
      request={async (params: Record<string, any>) => {
        const res = await financeApi.listReimbursements({
          ...params,
          keyword,
        });
        return { data: res, success: true };
      }}
      scroll={{ y: 600 }}
    />
  );
};
