import { Modal, Timeline, Typography, Tag, Space } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface AuditLog {
  operatorId: string;
  time: string;
  action: string;
  fromStatus?: number;
  toStatus?: number;
  [key: string]: any;
}

interface AuditLogModalProps {
  open: boolean;
  onClose: () => void;
  logs: AuditLog[];
  title?: string;
}

const actionMap: Record<string, string> = {
  'MARK_PAID': '标记已打款',
  'MARK_COMPLETED': '标记采购完成',
  'CREATE': '创建记录',
  'CANCEL': '已取消',
};

export const AuditLogModal = ({ open, onClose, logs = [], title = "操作审计日志" }: AuditLogModalProps) => {
  return (
    <Modal
      title={<Title level={4} className="m-0 font-black leixi-text-main">{title}</Title>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      className="leixi-modal"
    >
      <div className="py-6 px-2">
        {logs.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded border border-dashed border-slate-200">
             <Text className="text-slate-500 font-bold">暂无操作日志记录</Text>
          </div>
        ) : (
          <Timeline mode="left">
            {logs.map((log, index) => (
              <Timeline.Item 
                key={index} 
                dot={<ClockCircleOutlined className="text-slate-900" style={{ fontSize: '16px' }} />}
                label={<Text className="text-slate-500 font-bold text-xs">{new Date(log.time).toLocaleString()}</Text>}
              >
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm ml-2">
                  <Space direction="vertical" size={4} className="w-full">
                    <div className="flex justify-between items-center">
                      <Tag className="font-bold border-slate-900 text-slate-900 m-0">
                        {actionMap[log.action] || log.action}
                      </Tag>
                      <Space size={4}>
                        <UserOutlined className="text-slate-400" />
                        <Text className="text-slate-900 font-bold">UID: {log.operatorId.slice(-6)}</Text>
                      </Space>
                    </div>
                    {log.fromStatus !== undefined && log.toStatus !== undefined && (
                      <div className="text-xs text-slate-500 mt-1">
                        状态变更: <Text delete className="text-slate-400">{log.fromStatus}</Text> → <Text className="font-bold text-slate-900">{log.toStatus}</Text>
                      </div>
                    )}
                    {log.payMethod && (
                      <Text className="text-xs text-slate-600">支付方式: <Text className="font-bold">{log.payMethod}</Text></Text>
                    )}
                  </Space>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>
    </Modal>
  );
};
