import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Input,
  Button,
  List,
  Avatar,
  Alert,
  Divider,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  RobotOutlined,
  UserOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { serviceApi } from "@/api/service";
import { io, Socket } from "socket.io-client";
import { useVirtualizer } from "@tanstack/react-virtual";

const { Title, Text, Paragraph } = Typography;

interface Occupancy {
  userId: string;
  username: string;
  activity: string;
}

export default function ServiceSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // 1. 数据拉取
  const { data: session, isLoading } = useQuery({
    queryKey: ["service-session", id],
    queryFn: () => serviceApi.getSession(id!),
    enabled: !!id,
  });

  const messages = session?.messages || [];
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 预估每条消息的高度
    overscan: 10, // 预加载数量
  });

  // 2. Socket 实时占用逻辑
  useEffect(() => {
    const token = localStorage.getItem("token");
    const s = io("/ws", { auth: { token } });
    setSocket(s);

    s.on("connect", () => {
      // 开启监控并声明开始质检活动
      s.emit("service-session.watch", { sessionId: id });
      s.emit("service-session.presence.start", {
        sessionId: id,
        activity: "inspecting",
      });
    });

    s.on(
      "service-session.presence.changed",
      (data: { occupancies: Occupancy[] }) => {
        setOccupancies(
          data.occupancies.filter(
            (o) => o.userId !== localStorage.getItem("userId"),
          ),
        );
      },
    );

    return () => {
      s.emit("service-session.presence.stop", {
        sessionId: id,
        activity: "inspecting",
      });
      s.emit("service-session.unwatch", { sessionId: id });
      s.disconnect();
    };
  }, [id]);

  // 3. AI 分析操作
  const analyzeMutation = useMutation({
    mutationFn: () => serviceApi.analyzeSession(id!, { mode: "manual" }),
    onSuccess: () => {
      message.success("AI 质检分析完成");
      queryClient.invalidateQueries({ queryKey: ["service-session", id] });
    },
  });

  if (isLoading) return <div className="p-10 text-center">加载中...</div>;

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        className="font-bold"
      >
        返回列表
      </Button>

      {/* 协同质检提醒 (多人闭环核心) */}
      {occupancies.length > 0 && (
        <Alert
          message={
            <Space>
              <WarningOutlined className="text-red-600" />
              <Text className="font-bold text-red-600">多人协同警告：</Text>
              <Text className="text-slate-900 font-black">
                {occupancies.map((o) => o.username).join(", ")}
              </Text>
              <Text>也正在查看/质检此会话，请注意沟通避免重复提交！</Text>
            </Space>
          }
          type="error"
          showIcon={false}
          className="border-red-200 bg-red-50 shadow-sm"
        />
      )}

      <Row gutter={16}>
        {/* 左侧：聊天记录流 */}
        <Col span={16}>
          <Card
            title={
              <Title level={5} className="m-0 font-black text-slate-900">
                会话详情: {session?.session_no}
              </Title>
            }
            bordered={false}
            className="shadow-sm min-h-[600px] flex flex-col"
            styles={{
              body: { flex: 1, overflow: "hidden", padding: "16px 0" },
            }}
          >
            <div ref={parentRef} className="h-[600px] overflow-auto px-6">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                  const msg = messages[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        className={`flex mb-6 ${msg.sender_type === "agent" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${msg.sender_type === "agent" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <Avatar
                            icon={
                              msg.sender_type === "agent" ? (
                                <UserOutlined />
                              ) : (
                                <RobotOutlined />
                              )
                            }
                            className={
                              msg.sender_type === "agent"
                                ? "bg-blue-600"
                                : "bg-orange-500"
                            }
                          />
                          <div
                            className={`p-3 rounded-lg ${msg.sender_type === "agent" ? "bg-blue-600 text-white shadow-blue-100" : "bg-white border border-slate-200 shadow-sm"}`}
                          >
                            <div
                              className={`text-xs mb-1 font-bold ${msg.sender_type === "agent" ? "text-blue-100" : "text-slate-400"}`}
                            >
                              {msg.sender_name} ·{" "}
                              {new Date(msg.sent_at).toLocaleTimeString()}
                            </div>
                            <Paragraph
                              className={`m-0 font-medium ${msg.sender_type === "agent" ? "text-white" : "text-slate-900"}`}
                            >
                              {msg.content}
                            </Paragraph>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：AI 分析与质检操作 */}
        <Col span={8}>
          <Space direction="vertical" className="w-full" size={16}>
            <Card
              title={<Text className="font-black">AI 智能辅助</Text>}
              bordered={false}
              className="shadow-sm"
            >
              <Button
                block
                type="primary"
                icon={<RobotOutlined />}
                className="h-[44px] font-black"
                loading={analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
              >
                立即发起 AI 深度质检
              </Button>
              <Divider className="my-4" />
              <div className="space-y-4">
                <div>
                  <Text className="text-slate-500 text-xs block mb-1">
                    流失风险等级
                  </Text>
                  <Tag
                    color={
                      session?.latest_analysis?.loss_risk_level === "high"
                        ? "error"
                        : "success"
                    }
                    className="font-black border-2 px-4 py-1"
                  >
                    {session?.latest_analysis?.loss_risk_level === "high"
                      ? "🔥 极高风险"
                      : "低风险"}
                  </Tag>
                </div>
                <div>
                  <Text className="text-slate-500 text-xs block mb-1">
                    质检评分 (AI)
                  </Text>
                  <Title level={2} className="m-0 font-black text-blue-600">
                    {session?.latest_analysis?.quality_score ?? "--"}
                  </Title>
                </div>
              </div>
            </Card>

            <Card
              title={<Text className="font-black">整改建议</Text>}
              bordered={false}
              className="shadow-sm"
            >
              <List
                size="small"
                dataSource={session?.latest_analysis?.suggestions || []}
                renderItem={(item: string) => (
                  <List.Item className="border-none px-0">
                    <CheckCircleOutlined className="text-green-500 mr-2" />
                    <Text className="font-bold text-slate-700">{item}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
