/**
 * AI质检大屏页面（优化版）
 * 使用新的组件库重构，提供更好的视觉效果和用户体验
 */

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Row,
  Col,
  Space,
  Typography,
  Badge,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  MessageOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Line, Pie } from '@ant-design/plots';
import { PageContainer, SectionCard } from '@/components/layout';
import { MetricsCard, StatusTag } from '@/components/business';
import { Card, Button } from '@/components/ui';
import { serviceApi } from "@/api/service";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { formatNumber, formatPercent } from '@/utils/format';

const { Text } = Typography;

/**
 * 仪表板指标数据类型
 */
interface DashboardMetrics {
  totalSessions: number;
  lossSessionCount: number;
  qualityPassRate: number;
  sensitiveHitCount: number;
  comparison?: {
    sessionsGrowth?: number;
    lossGrowth?: number;
    qualityGrowth?: number;
  };
  trends?: Array<{
    date: string;
    sessions: number;
  }>;
  riskBuckets?: {
    high: number;
    medium: number;
    low: number;
  };
  topFaqs?: Array<{
    question: string;
    count: number;
  }>;
}

/**
 * 连接状态标签组件
 */
const ConnectionStatus: React.FC<{
  connected: boolean;
  lastSync?: string;
}> = ({ connected, lastSync }) => (
  <Space size="small">
    <StatusTag
      status={connected ? 'success' : 'error'}
      text={connected ? '实时连接' : '离线模式'}
      icon={connected ? <WifiOutlined /> : <DisconnectOutlined />}
      pulse={connected}
    />
    {lastSync && (
      <Text type="secondary" style={{ fontSize: 12 }}>
        最后更新: {lastSync}
      </Text>
    )}
  </Space>
);

const ServiceDashboard: React.FC = () => {
  const {
    metrics: realtimeMetrics,
    isConnected,
    lastUpdate,
    refresh
  } = useRealtimeDashboard();

  const { data: fallbackMetrics, refetch, isLoading } = useQuery({
    queryKey: ["service.dashboardMetrics"],
    queryFn: () => serviceApi.getDashboardMetrics(),
    staleTime: 5 * 60 * 1000,
    enabled: !isConnected,
  });

  const metrics: DashboardMetrics | undefined = realtimeMetrics || fallbackMetrics;

  // 键盘快捷键
  useKeyboardShortcuts({
    "ctrl+r": () => isConnected ? refresh() : refetch(),
  });

  // 会话趋势图表配置
  const trendConfig = useMemo(() => {
    if (!metrics?.trends) return null;
    return {
      data: metrics.trends,
      xField: 'date',
      yField: 'sessions',
      smooth: true,
      height: 300,
      line: {
        color: '#0089FF',
        size: 2
      },
      area: {
        style: {
          fill: 'l(90) 0:#0089FF 0.5:#ffffff 1:#ffffff',
          opacity: 0.1
        }
      },
      point: {
        size: 4,
        shape: 'circle',
        style: {
          fill: '#0089FF',
          stroke: '#ffffff',
          lineWidth: 2,
        },
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: '会话数',
          value: formatNumber(datum.sessions),
        }),
      },
    };
  }, [metrics?.trends]);

  // 风险分布饼图配置
  const riskPieConfig = useMemo(() => {
    if (!metrics?.riskBuckets) return null;
    const riskData = [
      { type: '高风险', value: metrics.riskBuckets.high, color: '#F5222D' },
      { type: '中风险', value: metrics.riskBuckets.medium, color: '#FF943E' },
      { type: '低风险', value: metrics.riskBuckets.low, color: '#00B322' },
    ];
    return {
      data: riskData,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      innerRadius: 0.6,
      color: riskData.map(d => d.color),
      legend: {
        position: 'bottom' as const,
        itemName: {
          style: {
            fontSize: 12,
          },
        },
      },
      label: {
        type: 'inner',
        offset: '-30%',
        content: ({ percent }: any) => `${(percent * 100).toFixed(0)}%`,
        style: {
          fontSize: 12,
          textAlign: 'center',
          fill: '#ffffff',
          fontWeight: 'bold',
        },
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: datum.type,
          value: formatNumber(datum.value),
        }),
      },
    };
  }, [metrics?.riskBuckets]);

  if (isLoading && !metrics) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh'
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <PageContainer
      title="AI质检大屏"
      subTitle="实时监控全平台服务质量与合规风险"
      breadcrumb={{
        items: [
          { title: '首页', path: '/' },
          { title: 'AI质检' },
          { title: '质检大屏' },
        ],
      }}
      extra={
        <Space size="large">
          <ConnectionStatus
            connected={isConnected}
            lastSync={lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : undefined}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={isConnected ? refresh : refetch}
            loading={isLoading}
          >
            刷新数据
          </Button>
        </Space>
      }
    >
      {/* 核心指标矩阵 */}
      <SectionCard title="核心指标" icon={<DashboardOutlined />}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <MetricsCard
              title="累计会话规模"
              value={metrics?.totalSessions || 0}
              trend={metrics?.comparison?.sessionsGrowth}
              icon={<MessageOutlined />}
              iconColor="#0089FF"
              glass
            />
          </Col>
          <Col span={6}>
            <MetricsCard
              title="高危流失拦截"
              value={metrics?.lossSessionCount || 0}
              trend={metrics?.comparison?.lossGrowth}
              icon={<AlertOutlined />}
              iconColor="#F5222D"
              glass
            />
          </Col>
          <Col span={6}>
            <MetricsCard
              title="综合质检合格率"
              value={formatPercent(metrics?.qualityPassRate || 0)}
              trend={metrics?.comparison?.qualityGrowth}
              icon={<SafetyCertificateOutlined />}
              iconColor="#00B322"
              glass
            />
          </Col>
          <Col span={6}>
            <MetricsCard
              title="敏感词触发频率"
              value={metrics?.sensitiveHitCount || 0}
              icon={<ThunderboltOutlined />}
              iconColor="#FF943E"
              glass
            />
          </Col>
        </Row>
      </SectionCard>

      {/* 主视图区域 */}
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <SectionCard title="服务流量趋势" glass>
            {trendConfig ? (
              <Line {...trendConfig} />
            ) : (
              <div style={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                暂无趋势数据
              </div>
            )}
          </SectionCard>
        </Col>
        <Col span={8}>
          <SectionCard title="风险分布画像" glass>
            {riskPieConfig ? (
              <Pie {...riskPieConfig} />
            ) : (
              <div style={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                暂无风险数据
              </div>
            )}
          </SectionCard>
        </Col>
      </Row>

      {/* TOP 业务热点 */}
      <SectionCard title="TOP 业务热点（实时聚合）" glass>
        {metrics?.topFaqs && metrics.topFaqs.length > 0 ? (
          <Row gutter={[16, 8]}>
            {metrics.topFaqs.slice(0, 10).map((faq, index) => (
              <Col span={12} key={index}>
                <Card
                  glass
                  hoverable
                  style={{
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <Space size="small">
                        <Badge
                          count={index + 1}
                          style={{
                            backgroundColor: index < 3 ? '#0089FF' : '#E4E7ED',
                            color: index < 3 ? '#fff' : '#646A73',
                            fontSize: 10,
                            minWidth: 18,
                            height: 18,
                            lineHeight: '18px'
                          }}
                        />
                        <Text
                          ellipsis={{ tooltip: faq.question }}
                          style={{
                            fontSize: 12,
                            color: '#333',
                            maxWidth: 200
                          }}
                        >
                          {faq.question}
                        </Text>
                      </Space>
                    </div>
                    <Badge
                      count={formatNumber(faq.count)}
                      overflowCount={999}
                      style={{
                        backgroundColor: index < 3 ? '#0089FF' : '#E4E7ED',
                        color: index < 3 ? '#fff' : '#646A73',
                        fontSize: 10
                      }}
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999'
          }}>
            暂无热点数据
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
};

export default ServiceDashboard;
