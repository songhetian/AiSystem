import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Spin, message, Badge, Tooltip } from 'antd';
import { SendOutlined, CloseOutlined, MinusOutlined, RobotOutlined, UserOutlined, MessageOutlined, FileSearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { knowledgeApi, KnowledgeChatMessage } from '@/api/knowledge';
import { useGlobalStore } from '@/models/global';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingChat: React.FC = () => {
  const { token } = useGlobalStore();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (visible && !sessionId) {
      handleNewSession();
    }
  }, [visible]);

  useEffect(scrollToBottom, [messages]);

  const handleNewSession = async () => {
    try {
      const session = await knowledgeApi.createChatSession('新对话');
      setSessionId(session.id);
      setMessages([]);
    } catch (err) {
      message.error('无法启动会话');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages([...messages, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', references: [] }]);

    try {
      const response = await fetch(`/api/knowledge/chat/sessions/${sessionId}/chat-stream?content=${encodeURIComponent(currentInput)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.body) throw new Error('No body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              acc += data.content;
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: acc } : m));
            }
            if (data.references) {
              setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, references: data.references } : m));
            }
          }
        }
      }
    } catch (err) {
      message.error('网络不稳定，请点击重试', 5);
      setMessages(prev => prev.filter(m => m.id !== aiMsgId)); // 清理空消息
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      <AnimatePresence>
        {!visible && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setVisible(true)} className="cursor-pointer group flex items-center space-x-2 bg-slate-900 p-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all">
            <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center">
              <RobotOutlined className="text-white text-xl" />
            </div>
            <span className="text-white font-black pr-2">豆包</span>
          </motion.div>
        )}

        {visible && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className={`bg-white shadow-2xl border border-slate-200 rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${minimized ? 'h-14 w-[380px]' : 'h-[550px] w-[380px]'}`}>
            {/* Header */}
            <div className="bg-white border-b border-slate-100 p-4 flex justify-between items-center h-14 shrink-0">
              <Space>
                <div className="bg-blue-500 w-7 h-7 rounded-lg flex items-center justify-center">
                  <RobotOutlined className="text-white text-sm" />
                </div>
                <span className="font-black text-slate-900">豆包助手</span>
              </Space>
              <Space>
                <Button type="text" size="small" icon={<MinusOutlined />} onClick={() => setMinimized(!minimized)} />
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setVisible(false)} />
              </Space>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-auto p-4 space-y-6 bg-slate-50">
                  {messages.length === 0 && !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                      <div className="bg-white p-6 rounded-full shadow-md">
                        <RobotOutlined style={{ fontSize: 48 }} className="text-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-slate-900">你好！我是豆包</h3>
                        <p className="text-slate-500 text-xs font-bold leading-loose">
                          你可以询问我关于考勤、报销或公积金政策的问题。
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Avatar size="small" icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} className={`${msg.role === 'user' ? 'ml-2 bg-slate-700' : 'mr-2 bg-slate-900'}`} />
                        <div className={`p-3 rounded-2xl text-xs leading-loose font-bold ${msg.role === 'user' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-900 shadow-sm border border-slate-100'}`}>
                          {msg.content || (msg.role === 'assistant' && <Spin size="small" />)}
                          
                          {/* 图片引用展示 */}
                          {msg.role === 'assistant' && msg.references?.some((r: any) => r.type === 'image') && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {msg.references.filter((r: any) => r.type === 'image').map((ref: any) => (
                                <Tooltip title="点击查看大图" key={ref.id}>
                                  <img 
                                    src={ref.url} 
                                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-all shadow-sm"
                                    onClick={() => window.open(ref.url, '_blank')}
                                  />
                                </Tooltip>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  <div className="relative">
                    <Input.TextArea value={input} onChange={(e) => setInput(e.target.value)} placeholder="请输入你的问题..." autoSize={{ minRows: 1, maxRows: 3 }} onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }} className="pr-12 pl-4 py-3 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm" />
                    <Button type="primary" size="small" icon={<SendOutlined />} onClick={handleSend} disabled={!input.trim() || loading} className="absolute right-2 bottom-2 rounded-xl bg-slate-900 border-none h-9 w-9" />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-slate-400 font-black">回答由 AI 生成</span>
                    <Button type="link" size="small" icon={<ReloadOutlined />} onClick={handleNewSession} className="text-[10px] p-0 font-black">清空对话</Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingChat;
