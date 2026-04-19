import { useEffect } from "react";
import { Modal, Space, Typography, message, notification } from "antd";
import { NotificationOutlined, MessageOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const { Text, Title } = Typography;

export interface RealtimeMessageEvent {
  action?: "created" | "read" | "read-all";
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

export function RealtimeNotificationCenter({
  lastEvent,
}: {
  lastEvent?: RealtimeMessageEvent;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io("/ws", { auth: { token } });

    socket.on("system.broadcast", (data: BroadcastMessage) => {
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
              <Text className="font-medium leading-relaxed text-slate-700">
                {data.content}
              </Text>
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
        okText: "我知道了",
        okButtonProps: {
          className: "h-[44px] border-none bg-slate-900 px-8 font-black",
        },
        cancelButtonProps: { style: { display: "none" } },
      });
    });

    socket.on("system.maintenance.start", () => {
      message.loading("系统正在进入维护模式...", 2).then(() => {
        navigate("/maintenance");
      });
    });

    socket.on("system.maintenance.end", () => {
      message.success("维护已结束，正在恢复访问...");
      navigate("/");
    });

    socket.on("system-message.new", (data: { title: string; type: string; content?: string }) => {
       notification.open({
          message: <Text className="font-black text-slate-900">{data.title}</Text>,
          description: <Text className="text-slate-500 font-bold">{data.content || '您收到一条新消息'}</Text>,
          icon: <MessageOutlined className="text-blue-500" />,
          placement: 'topRight',
          duration: 3,
          className: "rounded-xl border border-slate-100 shadow-xl backdrop-blur-md bg-white/90",
          onClick: () => navigate('/system/messages')
       });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  void lastEvent;
  return null;
}
