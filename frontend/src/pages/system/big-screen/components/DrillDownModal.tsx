import React from 'react';
import { Modal, Tag, Typography } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { financeApi } from '@/api/finance';
import { serviceApi } from '@/api/service';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onCancel: () => void;
  type: 'order' | 'employee' | 'interface_error' | null;
  platformId?: string;
}

/**
 * 数据钻取明细弹效 (Section 2.3.2)
 * 特点：高性能 ProTable 加载、工业级行列排布
 */
export const DrillDownModal: React.FC<Props> = ({ visible, onCancel, type, platformId }) => {
  const getColumns = () => {
    if (type === 'order') {
      return [
        { title: '订单号', dataIndex: 'order_no', copyable: true },
        { title: '平台', dataIndex: 'platform_name' },
        { title: '金额', dataIndex: 'order_amount', valueType: 'money' },
        { title: '状态', dataIndex: 'order_status', render: (val: any) => <Tag color="blue">{val}</Tag> },
        { title: '下单时间', dataIndex: 'order_time', valueType: 'dateTime' },
      ];
    }
    if (type === 'interface_error') {
      return [
        { title: '异常时间', dataIndex: 'create_time', valueType: 'dateTime' },
        { title: '业务类型', dataIndex: 'biz_type' },
        { title: '错误摘要', dataIndex: 'message', ellipsis: true },
        { title: '耗时', dataIndex: 'duration_ms', render: (val: any) => <Text type="danger">{val}ms</Text> },
      ];
    }
    return [];
  };

  const getTitle = () => {
    switch (type) {
      case 'order': return '电商订单明细钻取';
      case 'interface_error': return '核心接口异常日志下钻';
      default: return '指标明细';
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={1000}
      title={<span className="text-slate-900 font-black">{getTitle()}</span>}
      footer={null}
      destroyOnClose
    >
      <ProTable
        columns={getColumns() as any}
        request={async (params) => {
          if (type === 'order') {
            const res = await (financeApi as any).listOrders?.(params) || { data: [] };
            return res;
          }
          // Mocking logs if specific API is not implemented yet
          return { data: [], success: true };
        }}
        rowKey="id"
        search={false}
        options={false}
        pagination={{ pageSize: 10 }}
        headerTitle={false}
      />
    </Modal>
  );
};
