import { useEffect } from 'react';
import { Modal, Space, Typography, message } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import { history } from 'umi';
import { io } from 'socket.io-client';

const { Text, Title } = Typography;

export interface RealtimeMessageEvent {
  action?: 'created' | 'read' | 'read-all';
  messageId?: string;
  messageType?: string;
  bizType?: string;
  bizId?: string;
  route?: string;
  emittedAt?: string;
}

interface BroadcastMessage {
  title: string;
  content: string;
  level?: string;
  sentAt: string;
}

export function RealtimeNotificationCenter({ lastEvent }: { lastEvent?: RealtimeMessageEvent }) {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io('/ws', { auth: { token } });

    socket.on('system.broadcast', (data: BroadcastMessage) => {
      Modal.confirm({
        title: (
          <Space>
            <NotificationOutlined className="text-blue-600" />
            <Text className="font-black text-lg">系统全局广播</Text>
          </Space>
        ),
        content: (
          <div className="mt-4">
            <Title level={4} className="font-black text-slate-900">
              {data.title}
            </Title>
            <div className="mt-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
              <Text className="font-medium leading-relaxed text-slate-700">{data.content}</Text>
            </div>
            <div className="mt-4 text-right">
              <Text className="text-xs text-slate-400">
                发送时间 {new Date(data.sentAt).toLocaleString()}
              </Text>
            </div>
          </div>
        ),
        icon: null,
        width: 500,
        okText: '我知道了',
        okButtonProps: { className: 'h-[44px] border-none bg-slate-900 px-8 font-black' },
        cancelButtonProps: { style: { display: 'none' } },
      });
    });

    socket.on('system.maintenance.start', () => {
      message.loading('系统正在进入维护模式...', 2).then(() => {
        history.push('/maintenance');
      });
    });

    socket.on('system.maintenance.end', () => {
      message.success('维护已结束，正在恢复访问...');
      history.push('/');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  void lastEvent;
  return null;
}
