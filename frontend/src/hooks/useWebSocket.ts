import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = false,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (socket?.connected) {
      return socket;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionError('未找到认证令牌');
      return null;
    }

    const newSocket = io('/ws', {
      auth: {
        token: token.replace('Bearer ', ''),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // 连接成功
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectCount.current = 0;
      
      // 清除重连定时器
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = undefined;
      }
    });

    // 连接断开
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // 如果不是主动断开，尝试重连
      if (reason !== 'io client disconnect' && reconnectCount.current < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    // 连接错误
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      
      if (reconnectCount.current < reconnectAttempts) {
        scheduleReconnect();
      } else {
        message.error('WebSocket连接失败，请刷新页面重试');
      }
    });

    // 服务器错误
    newSocket.on('realtime.error', (error) => {
      console.error('WebSocket server error:', error);
      message.error(error.message || 'WebSocket服务器错误');
    });

    // 就绪事件
    newSocket.on('realtime.ready', (data) => {
      console.log('WebSocket ready:', data);
    });

    setSocket(newSocket);
    return newSocket;
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
    
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = undefined;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    reconnectCount.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectCount.current - 1); // 指数退避

    console.log(`Scheduling reconnect attempt ${reconnectCount.current}/${reconnectAttempts} in ${delay}ms`);

    reconnectTimer.current = setTimeout(() => {
      if (reconnectCount.current <= reconnectAttempts) {
        console.log(`Reconnecting... (attempt ${reconnectCount.current}/${reconnectAttempts})`);
        connect();
      }
    }, delay);
  };

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // 页面可见性变化时重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && socket) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, socket]);

  return {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnectCount: reconnectCount.current,
  };
}