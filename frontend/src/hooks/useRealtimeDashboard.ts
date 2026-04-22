import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { message } from 'antd';

interface DashboardMetrics {
  totalSessions: number;
  todaySessions: number;
  lossSessionCount: number;
  qualityPassRate: number;
  sensitiveHitCount: number;
  riskBuckets: {
    high: number;
    medium: number;
    low: number;
  };
  topFaqs: Array<{
    question: string;
    count: number;
  }>;
  trends: Array<{
    date: string;
    sessions: number;
    quality: number;
  }>;
  realTimeStats: {
    currentHourSessions: number;
    onlineAgents: number;
    avgResponseTime: number;
  };
  comparison: {
    sessionsGrowth: number;
    qualityGrowth: number;
    lossGrowth: number;
  };
  lastUpdate: string;
  dataSource: string;
}

interface DashboardUpdate {
  timestamp: string;
  data: DashboardMetrics;
  performance?: {
    calculationTime: number;
  };
  triggered?: string;
}

export function useRealtimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [performance, setPerformance] = useState<{ calculationTime?: number }>({});

  const { socket, isConnected, connect, disconnect } = useWebSocket({
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 2000,
  });

  // 订阅大屏数据
  const subscribe = useCallback(() => {
    if (!socket || !isConnected) {
      console.warn('Cannot subscribe: socket not connected');
      return;
    }

    socket.emit('dashboard.subscribe');
  }, [socket, isConnected]);

  // 取消订阅
  const unsubscribe = useCallback(() => {
    if (!socket) return;
    
    socket.emit('dashboard.unsubscribe');
    setIsSubscribed(false);
  }, [socket]);

  // 手动刷新数据
  const refresh = useCallback(() => {
    if (!socket || !isConnected) {
      message.warning('连接断开，无法刷新数据');
      return;
    }

    socket.emit('dashboard.request.refresh');
    message.info('数据刷新请求已发送');
  }, [socket, isConnected]);

  // 设置事件监听器
  useEffect(() => {
    if (!socket) return;

    // 订阅成功
    const handleSubscribed = (data: any) => {
      console.log('Dashboard subscribed:', data);
      setIsSubscribed(true);
      message.success('已连接到实时数据流');
    };

    // 取消订阅成功
    const handleUnsubscribed = (data: any) => {
      console.log('Dashboard unsubscribed:', data);
      setIsSubscribed(false);
    };

    // 数据更新
    const handleMetricsUpdate = (update: DashboardUpdate) => {
      console.log('Dashboard metrics updated:', update);
      setMetrics(update.data);
      setLastUpdate(update.timestamp);
      setUpdateCount(prev => prev + 1);
      
      if (update.performance) {
        setPerformance(update.performance);
      }

      // 显示更新提示（仅手动触发时）
      if (update.triggered === 'manual') {
        message.success('数据已更新');
      }
    };

    // 刷新请求确认
    const handleRefreshAcknowledged = (data: any) => {
      console.log('Dashboard refresh acknowledged:', data);
    };

    // 错误处理
    const handleError = (error: any) => {
      console.error('Dashboard error:', error);
      message.error(error.message || '大屏数据获取失败');
    };

    // 注册事件监听器
    socket.on('dashboard.subscribed', handleSubscribed);
    socket.on('dashboard.unsubscribed', handleUnsubscribed);
    socket.on('dashboard.metrics.updated', handleMetricsUpdate);
    socket.on('dashboard.refresh.acknowledged', handleRefreshAcknowledged);
    socket.on('dashboard.error', handleError);

    // 连接成功后自动订阅
    if (isConnected && !isSubscribed) {
      subscribe();
    }

    return () => {
      socket.off('dashboard.subscribed', handleSubscribed);
      socket.off('dashboard.unsubscribed', handleUnsubscribed);
      socket.off('dashboard.metrics.updated', handleMetricsUpdate);
      socket.off('dashboard.refresh.acknowledged', handleRefreshAcknowledged);
      socket.off('dashboard.error', handleError);
    };
  }, [socket, isConnected, isSubscribed, subscribe]);

  // 组件卸载时取消订阅
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // 连接状态变化时处理订阅
  useEffect(() => {
    if (isConnected && !isSubscribed) {
      subscribe();
    }
  }, [isConnected, isSubscribed, subscribe]);

  return {
    // 数据
    metrics,
    lastUpdate,
    updateCount,
    performance,
    
    // 状态
    isConnected,
    isSubscribed,
    
    // 操作
    subscribe,
    unsubscribe,
    refresh,
    connect,
    disconnect,
  };
}