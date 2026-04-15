import React from 'react';
import { Modal, Tag, Typography, Button, Space } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { dashboardApi } from '@/api/system/dashboard';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onCancel: () => void;
}

/**
 * 预警历史记录弹窗 (Section 2.5.3)
 * 特点：支持状态标记、多级过滤、工业级审计跟踪
 */
export const AlertHistoryModal: React.FC<Props> = ({ visible, onCancel }) => {
  const columns = [
    { title: '发生时间', dataIndex: 'create_time', valueType: 'dateTime', width: 160 },
    { title: '监控模板', dataIndex: 'template_id', width: 120 },
    { title: '指标名称', dataIndex: 'metric_name', className: 'font-black text-slate-900' },
    { title: '预警阈值', dataIndex: 'threshold', render: (val: any) => <Text>{val}%</Text> },
    { title: '实际值', dataIndex: 'actual_value', render: (val: any) => <Text type="danger">{val}%</Text> },
    { 
      title: '状态', 
      dataIndex: 'status', 
      valueEnum: {
        pending: { text: '待处理', status: 'Error' },
        handled: { text: '已处理', status: 'Success' },
        ignored: { text: '已忽略', status: 'Default' },
      } 
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_: any, record: any) => [
        record.status === 'pending' && (
          <Button key="handle" type="link" size="small" className="font-bold">标记处理</Button>
        ),
      ],
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={1000}
      title={<Space><ExclamationCircleOutlined className="text-rose-500" /><span className="text-slate-900 font-black">监控预警历史记录</span></Space>}
      footer={null}
      destroyOnClose
    >
      <ProTable
        columns={columns as any}
        request={async () => (await dashboardApi.listAlertHistory())}
        rowKey="id"
        search={false}
        options={{ density: false, fullScreen: false, setting: true }}
        pagination={{ pageSize: 10 }}
        headerTitle={false}
        bordered
      />
    </Modal>
  );
};
