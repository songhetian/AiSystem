import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Avatar, Spin, message, Tooltip } from 'antd';
import {
  SendOutlined, CloseOutlined, RobotOutlined,
  UserOutlined, ReloadOutlined, PlusOutlined,
} from '@ant-design/icons';
import { knowledgeApi } from '@/api/knowledge';
import { useGlobalStore } from '@/models/global';

const FloatingChat: React.FC = () => {
  const { token, currentUser } = useGlobalStore();
  const [visible, setVisible] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (visible && !sessionId) handleNewSession();
  }, [visible]);

  useEffect(scrollToBottom, [messages]);

  const handleNewSession = async () => {
    try {
      const session = await knowledgeApi.createChatSession('新对话');
      setSessionId(session.id);
      setMessages([]);
    } catch {
      message.error('无法启动会话');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', references: [] }]);
    try {
      const response = await fetch(
        `/api/knowledge/chat/sessions/${sessionId}/chat-stream?content=${encodeURIComponent(currentInput)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.body) throw new Error('No body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
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
    } catch {
      message.error('网络不稳定，请重试', 4);
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = currentUser?.avatar;

  return (
    <>
      {/* ── 全局样式 ── */}
      <style>{`
        @keyframes fc-pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes fc-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .fc-trigger { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
        .fc-trigger-ring {
          position: absolute; inset: -6px; border-radius: 50%;
          background: radial-gradient(circle, rgba(47,122,247,0.35) 0%, transparent 70%);
          animation: fc-pulse 2.2s ease-out infinite;
          pointer-events: none;
        }
        .fc-trigger-btn {
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, #3b8fff 0%, #2563eb 100%);
          box-shadow: 0 8px 32px rgba(37,99,235,0.45), 0 2px 8px rgba(0,0,0,0.15);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: 2.5px solid rgba(255,255,255,0.3);
        }
        .fc-trigger-btn:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(37,99,235,0.55); }
        .fc-trigger-label { font-size: 12px; font-weight: 600; color: #1e293b; letter-spacing: 0.02em; }

        .fc-panel {
          width: 380px; height: 560px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08);
          display: flex; flex-direction: column; overflow: hidden;
          animation: fc-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
          border: 1px solid rgba(226,232,240,0.8);
        }

        .fc-header {
          padding: 0 20px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }
        .fc-header-left { display: flex; align-items: center; gap: 10px; }
        .fc-header-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #3b8fff 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
        }
        .fc-header-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .fc-header-actions { display: flex; align-items: center; gap: 4px; }

        .fc-messages {
          flex: 1; overflow-y: auto; padding: 20px 16px;
          background: #f8fafc;
          display: flex; flex-direction: column; gap: 16px;
        }
        .fc-messages::-webkit-scrollbar { width: 4px; }
        .fc-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        .fc-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px; text-align: center;
        }
        .fc-empty-icon {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, #3b8fff 0%, #2563eb 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(37,99,235,0.3);
        }

        .fc-msg-row { display: flex; align-items: flex-end; gap: 8px; }
        .fc-msg-row.user { flex-direction: row-reverse; }
        .fc-bubble {
          max-width: 75%; padding: 10px 14px;
          border-radius: 18px; font-size: 13px; line-height: 1.7; font-weight: 450;
        }
        .fc-bubble.assistant {
          background: #ffffff; color: #1e293b;
          border-radius: 4px 18px 18px 18px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.07);
          border: 1px solid #e2e8f0;
        }
        .fc-bubble.user {
          background: linear-gradient(135deg, #3b8fff 0%, #2563eb 100%);
          color: #ffffff; font-weight: 500;
          border-radius: 18px 4px 18px 18px;
          box-shadow: 0 2px 12px rgba(37,99,235,0.3);
        }

        .fc-input-area {
          padding: 14px 16px 16px;
          background: #ffffff; border-top: 1px solid #f1f5f9; flex-shrink: 0;
        }
        .fc-input-row { display: flex; align-items: flex-end; gap: 10px; }
        .fc-input-box {
          flex: 1; background: #f8fafc !important;
          border: 1.5px solid #e2e8f0 !important; border-radius: 12px !important;
          font-size: 13px !important; padding: 10px 14px !important;
          resize: none; transition: border-color 0.2s !important;
        }
        .fc-input-box:focus { border-color: #3b8fff !important; box-shadow: 0 0 0 3px rgba(59,143,255,0.12) !important; }
        .fc-send-btn {
          width: 42px; height: 42px; border-radius: 12px !important;
          background: linear-gradient(135deg, #3b8fff 0%, #2563eb 100%) !important;
          border: none !important; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(37,99,235,0.35) !important;
          display: flex; align-items: center; justify-content: center;
          transition: opacity 0.2s, transform 0.15s !important;
        }
        .fc-send-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.05); }
        .fc-send-btn:disabled { opacity: 0.4 !important; }
        .fc-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .fc-footer-hint { font-size: 11px; color: #94a3b8; }
      `}</style>

      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>

        {/* ── 聊天面板 ── */}
        {visible && (
          <div className="fc-panel">
            {/* Header */}
            <div className="fc-header">
              <div className="fc-header-left">
                <div className="fc-header-avatar">
                  <svg width="18" height="13" viewBox="0 0 22 16" fill="none">
                    <text x="0" y="13" fontFamily="'Inter','PingFang SC',sans-serif" fontWeight="800" fontSize="14" fill="white" letterSpacing="-0.5">AI</text>
                  </svg>
                </div>
                <span className="fc-header-title">AI</span>
              </div>
              <div className="fc-header-actions">
                <Tooltip title="新建对话">
                  <Button
                    type="text" size="small" icon={<PlusOutlined />}
                    onClick={handleNewSession}
                    style={{ color: '#64748b', borderRadius: 8 }}
                  />
                </Tooltip>
                <Tooltip title="关闭">
                  <Button
                    type="text" size="small" icon={<CloseOutlined />}
                    onClick={() => setVisible(false)}
                    style={{ color: '#64748b', borderRadius: 8 }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Messages */}
            <div className="fc-messages">
              {messages.length === 0 && !loading && (
                <div className="fc-empty">
                  <div className="fc-empty-icon">
                    <svg width="38" height="28" viewBox="0 0 38 28" fill="none">
                      <text x="0" y="24" fontFamily="'Inter','PingFang SC',sans-serif" fontWeight="900" fontSize="26" fill="white" letterSpacing="-1">AI</text>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      你好！我是 AI
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
                      可以向我询问考勤、审批、知识库<br />等相关问题，我会尽力帮助您。
                    </div>
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`fc-msg-row ${msg.role === 'user' ? 'user' : ''}`}>
                  {/* Avatar */}
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                    }}>
                      <svg width="18" height="13" viewBox="0 0 22 16" fill="none">
                        <text x="0" y="13" fontFamily="'Inter','PingFang SC',sans-serif" fontWeight="800" fontSize="14" fill="white" letterSpacing="-0.5">AI</text>
                      </svg>
                    </div>
                  )}

                  <div className={`fc-bubble ${msg.role}`}>
                    {msg.content || (msg.role === 'assistant' && <Spin size="small" />)}
                    {/* 图片引用 */}
                    {msg.role === 'assistant' && msg.references?.some((r: any) => r.type === 'image') && (
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {msg.references.filter((r: any) => r.type === 'image').map((ref: any) => (
                          <Tooltip title="点击查看大图" key={ref.id}>
                            <img
                              src={ref.url}
                              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                              onClick={() => window.open(ref.url, '_blank')}
                            />
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <Avatar
                      size={30}
                      src={avatarUrl}
                      icon={!avatarUrl && <UserOutlined />}
                      style={{ flexShrink: 0, background: '#475569' }}
                    />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="fc-input-area">
              <div className="fc-input-row">
                <Input.TextArea
                  className="fc-input-box"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="用户消息"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button
                  className="fc-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                >
                  <SendOutlined style={{ color: '#fff', fontSize: 15 }} />
                </button>
              </div>
              <div className="fc-footer">
                <span className="fc-footer-hint">回答由 AI 生成，仅供参考</span>
                <Button
                  type="link" size="small" icon={<ReloadOutlined />}
                  onClick={handleNewSession}
                  style={{ fontSize: 11, padding: 0, color: '#94a3b8' }}
                >
                  清空对话
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 悬浮按钮 ── */}
        {!visible && (
          <div className="fc-trigger" onClick={() => setVisible(true)}>
            <div className="fc-trigger-ring" style={{ animationDuration: '3s', opacity: 0.4 }} />
            <div style={{
              width: 58, height: 58, 
              borderRadius: '18px', // Squircle style
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(37,99,235,0.4), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => { 
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) scale(1.05)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 30px -10px rgba(37,99,235,0.5)';
            }}
            onMouseLeave={e => { 
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 25px -5px rgba(37,99,235,0.4)';
            }}
            >
              {/* Subtle glass reflection effect */}
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
              
              <svg width="34" height="24" viewBox="0 0 36 26" fill="none">
                <text
                  x="0" y="22"
                  fontFamily="'Inter','PingFang SC',sans-serif"
                  fontWeight="900" fontSize="22" fill="white" letterSpacing="-1"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >AI</text>
                <rect x="28" y="2" width="4" height="4" rx="1" fill="white" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FloatingChat;
