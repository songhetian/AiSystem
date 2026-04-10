import { useState } from 'react';
import { Card, Input, Typography } from 'antd';
import { BaseTable } from '@/components/table/BaseTable';
import { financeApi } from '@/api/finance';

const { Text } = Typography;

export default function PurchasesPage() {
  const [keyword, setKeyword] = useState('');

  const columns = [
    { title: '采购单号', dataIndex: 'purchase_no', className: 'leixi-text-main font-bold' },
    { title: '申请人', dataIndex: 'applicantName', className: 'leixi-text-main' },
    { title: '总金额', dataIndex: 'total_amount', render: (val: number) => <Text className="leixi-text-main font-black text-red-600">￥{val}</Text> },
    { title: '状态', dataIndex: 'status', render: (val: number) => <Tag>{val}</Tag> },
    { title: '提交时间', dataIndex: 'create_time', className: 'leixi-text-secondary' }
  ];

  return (
    <div className="leixi-page-container">
      <Card className="shadow-sm mb-4" bodyStyle={{ padding: '16px 24px' }}>
        <Input.Search 
          placeholder="搜索采购单号..." 
          onSearch={setKeyword} 
          style={{ width: 300, height: '44px' }} 
          className="leixi-filter-border"
        />
      </Card>
      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <BaseTable 
          columns={columns} 
          request={async (params) => {
            const res = await financeApi.listPurchases({ ...params, keyword });
            return { data: res, success: true };
          }} 
          scroll={{ y: 600 }}
        />
      </Card>
    </div>
  );
}