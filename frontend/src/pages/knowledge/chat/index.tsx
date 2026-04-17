import React, { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  List,
  Avatar,
  Spin,
  message,
  Space,
  Card,
  Tag,
  Popover,
  Divider,
  Modal,
  Drawer,
} from "antd";
import {
  SendOutlined,
  PlusOutlined,
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  FileSearchOutlined,
  DownloadOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import {
  knowledgeApi,
  KnowledgeChatSession,
  KnowledgeChatMessage,
} from "@/api/knowledge";
import { useGlobalStore } from "@/models/global";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import dayjs from "dayjs";

const KnowledgeChat: React.FC = () => {
  const { token } = useGlobalStore();
  const [sessions, setSessions] = useState<KnowledgeChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerContent, setDrawerContent] = useState({
    title: "",
    content: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useKeyboardShortcuts({
    "Ctrl+n": () => handleCreateSession(),
    "Ctrl+f": () => inputRef.current?.focus(),
    "Ctrl+e": () => exportChat(),
    Escape: () => setDrawerVisible(false),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(scrollToBottom, [messages]);

  const fetchSessions = async () => {
    setSessionLoading(true);
    try {
      const data = await knowledgeApi.listChatSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      message.error("获取对话列表失败");
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const data = await knowledgeApi.getChatMessages(id);
      setMessages(data);
    } catch (err) {
      message.error("获取消息历史失败");
    }
  };

  const handleCreateSession = async () => {
    try {
      const newSession = await knowledgeApi.createChatSession(
        "新对话 " + dayjs().format("HH:mm"),
      );
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (err) {
      message.error("创建对话失败");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      create_time: new Date().toISOString(),
    };
    setMessages([...messages, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        role: "assistant",
        content: "",
        references: [],
        create_time: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch(
        `/api/knowledge/chat/sessions/${currentSessionId}/chat-stream?content=${encodeURIComponent(currentInput)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              accumulatedContent += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: accumulatedContent } : m,
                ),
              );
            }
            if (data.references) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, references: data.references } : m,
                ),
              );
            }
          }
        }
      }
    } catch (err) {
      message.error("对话解析出错");
    } finally {
      setLoading(false);
    }
  };

  const exportChat = () => {
    const chatText = messages
      .map(
        (m) =>
          `[${m.role === "user" ? "用户" : "助手"}] ${dayjs(m.create_time).format("HH:mm:ss")}\n${m.content}\n`,
      )
      .join("\n---\n");
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `对话导出_${dayjs().format("YYYYMMDD_HHmm")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("导出成功");
  };

  const viewFullContent = async (ref: any) => {
    try {
      let content = "";
      if (ref.type === "document") {
        const res = await knowledgeApi.getDocumentContent(
          ref.metadata?.doc_id || ref.id.split("-p")[0],
        );
        content = res.content;
      } else {
        const res = await knowledgeApi.getArticle(ref.id);
        content = res.content;
      }
      setDrawerContent({ title: ref.title, content });
      setDrawerVisible(true);
    } catch (err) {
      message.error("获取全文失败");
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-50 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="large"
            className="h-[44px] font-bold bg-slate-900 border-none"
            onClick={handleCreateSession}
          >
            开启新对话
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <List
            dataSource={sessions}
            renderItem={(item) => (
              <div
                onClick={() => setCurrentSessionId(item.id)}
                className={`p-3 mb-1 rounded-xl cursor-pointer flex items-center space-x-3 ${currentSessionId === item.id ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <MessageOutlined
                  className={
                    currentSessionId === item.id
                      ? "text-slate-900"
                      : "text-slate-400"
                  }
                />
                <span
                  className={`truncate flex-1 text-sm ${currentSessionId === item.id ? "font-black text-slate-900" : "text-slate-600 font-medium"}`}
                >
                  {item.title}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#f8fafc]">
        {/* Header with Export */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white">
          <span className="font-black text-slate-900">
            {sessions.find((s) => s.id === currentSessionId)?.title ||
              "知识库对话"}
          </span>
          <Button
            icon={<DownloadOutlined />}
            onClick={exportChat}
            className="font-bold text-slate-600"
          >
            导出对话
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar
                  icon={
                    msg.role === "user" ? <UserOutlined /> : <RobotOutlined />
                  }
                  className={`${msg.role === "user" ? "ml-3 bg-slate-700" : "mr-3 bg-slate-900"}`}
                />
                <div>
                  <div
                    className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white text-slate-900 border border-slate-100 rounded-tl-none font-medium"
                    }`}
                  >
                    {msg.content ||
                      (msg.role === "assistant" && <Spin size="small" />)}
                  </div>
                  {msg.role === "assistant" && msg.references?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center font-bold">
                        资料来源：
                      </span>
                      {msg.references.map((ref: any, idx: number) => (
                        <Popover
                          key={ref.id}
                          title={
                            <span className="font-black text-slate-900">
                              {ref.title}
                            </span>
                          }
                          content={
                            <div className="max-w-xs">
                              <div className="text-slate-600 text-xs mb-2 leading-relaxed italic border-l-2 border-slate-200 pl-2">
                                {ref.text}
                              </div>
                              <Button
                                type="link"
                                size="small"
                                icon={<FullscreenOutlined />}
                                onClick={() => viewFullContent(ref)}
                                className="p-0 font-bold"
                              >
                                查看全文
                              </Button>
                              <Divider className="my-2" />
                              <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>
                                  相关度: {(ref.score * 100).toFixed(1)}%
                                </span>
                                <Tag size="small" color="blue">
                                  {ref.type}
                                </Tag>
                              </div>
                            </div>
                          }
                        >
                          <Tag
                            icon={<FileSearchOutlined />}
                            className="bg-slate-100 border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-200 text-[10px] font-bold"
                          >
                            [{idx + 1}] {ref.title.substring(0, 10)}...
                          </Tag>
                        </Popover>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="p-6 bg-transparent">
          <div className="max-w-4xl mx-auto relative">
            <Input.TextArea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题，基于部门内部知识库回答..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="pr-16 pl-6 py-4 rounded-3xl border-slate-200 shadow-lg text-slate-900 font-bold"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 bottom-3 h-10 w-10 rounded-full bg-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Full Content Drawer */}
      <Drawer
        title={
          <span className="font-black text-slate-900">
            {drawerContent.title}
          </span>
        }
        placement="right"
        width={800}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="font-medium"
      >
        <div className="whitespace-pre-wrap text-slate-800 leading-loose text-base bg-slate-50 p-6 rounded-xl border border-slate-100">
          {drawerContent.content}
        </div>
      </Drawer>
    </div>
  );
};

export default KnowledgeChat;
