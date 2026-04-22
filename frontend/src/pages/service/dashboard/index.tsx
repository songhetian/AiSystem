import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Badge, 
  Button,
  Alert,
  Spin,
  Tooltip,
  Progress
} from "antd";
import {
  BulbOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  MessageOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
} from "@ant-design/icons";
import { Line, Pie } from '@ant-design/plots';
import { serviceApi } from "@/api/service";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

const { Title, Text } = Typography;

export default function ServiceDashboard() {
  // 实时数据
  const { 
    metrics: realtimeMetrics, 
    isConnected, 
    isSubscribed,
    lastUpdate,
    updateCount,
    performance,
    refresh 
  } = useRealtimeDashboard();

  // 降级到静态数据查询
  const { data: fallbackMetrics, refetch, isLoading } = useQuery({
    queryKey: ["service.dashboardMetrics"],
    queryFn: () => serviceApi.getDashboardMetrics(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !isConnected, // 仅在 WebSocket 未连接时启用
  });

  // 使用实时数据或降级数据
  const metrics = realtimeMetrics || fallbackMetrics;

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => {
      if (isConnected) {
        refresh();
      } else {
        refetch();
      }
    },
  });

  // 趋势图配置
  const trendConfig = useMemo(() => {
    if (!metrics?.trends) return null;

    return {
      data: metrics.trends,
      xField: 'date',
      yField: 'sessions',
      smooth: true,
      point: {
        size: 4,
        shape: 'circle',
      },
      line: {
        color: '#1890ff',
        size: 2,
      },
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: '会话数',
          value: `${datum.sessions} 个`,
        }),
      },
    };
  }, [metrics?.trends]);

  // 风险分布饼图配置
  const riskPieConfig = useMemo(() => {
    if (!metrics?.riskBuckets) return null;

    const riskData = [
      { type: '高风险', value: metrics.riskBuckets.high, color: '#ff4d4f' },
      { type: '中等风险', value: metrics.riskBuckets.medium, color: '#faad14' },
      { type: '低风险', value: metrics.riskBuckets.low, color: '#52c41a' },
    ].filter(item => item.value > 0);

    return {
      data: riskData,
      angleField: 'value',
      colorField: 'type',
      radius: 0.8,
      innerRadius: 0.4,
      label: {
        type: 'outer',
        content: '{name}\n{percentage}',
      },
      color: riskData.map(item => item.color),
      interactions: [{ type: 'element-active' }],
      tooltip: {
        formatter: (datum: any) => ({
          name: datum.type,
          value: `${datum.value} 个会话`,
        }),
      },
    };
  }, [metrics?.riskBuckets]);

  // 增长率指示器
  const GrowthIndicator = ({ value, label }: { value: number; label: string }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">{label}</span>
        {isPositive && <TrendingUpOutlined className="text-green-500" />}
        {isNegative && <TrendingDownOutlined className="text-red-500" />}
        <span className={`text-xs font-bold ${
          isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-500'
        }`}>
          {value > 0 ? '+' : ''}{value}%
        </span>
      </div>
    );
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" tip="加载大屏数据中..." />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col gap-6 bg-gray-50 min-h-screen">
      {/* 头部状态栏 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <Title
          level={4}
          className="!m-0 text-slate-900 font-black tracking-tight"
        >
          智能质检实时大屏
        </Title>
        <Space size="large">
          {/* 连接状态 */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge status="success" text={
                <span className="text-green-600 font-medium">
                  <WifiOutlined /> 实时连接
                </span>
              } />
            ) : (
              <Badge status="error" text={
                <span className="text-red-600 font-medium">
                  <DisconnectOutlined /> 连接断开
                </span>
              } />
            )}
            {isSubscribed && (
              <Text className="text-xs text-gray-500">
                已更新 {updateCount} 次
              </Text>
            )}
          </div>

          {/* 性能指标 */}
          {performance?.calculationTime && (
            <Tooltip title="数据计算耗时">
              <Text className="text-xs text-gray-500">
                计算: {performance.calculationTime}ms
              </Text>
            </Tooltip>
          )}

          {/* 最后更新时间 */}
          <Text className="text-slate-500 font-medium">
            最后更新: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--'}
          </Text>

          {/* 刷新按钮 */}
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={isConnected ? refresh : refetch}
            size="small"
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 连接状态提示 */}
      {!isConnected && (
        <Alert
          message="实时连接已断开"
          description="正在使用缓存数据，部分功能可能受限。请检查网络连接或刷新页面。"
          type="warning"
          showIcon
          closable
        />
      )}

      {/* 核心指标卡片 */}
      <Row gutter={[24, 24]}>
        <Col span={6}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          >
            <Statistic
              title={<Text className="text-blue-700 font-bold">总会话数</Text>}
              value={metrics?.totalSessions || 0}
              prefix={<MessageOutlined className="text-blue-500" />}
              valueStyle={{ color: "#1e40af", fontWeight: 900 }}
              suffix={
                metrics?.comparison && (
                  <GrowthIndicator 
                    value={metrics.comparison.sessionsGrowth} 
                    label="较昨日" 
                  />
                )
              }
            />
            {metrics?.todaySessions !== undefined && (
              <div className="mt-2 text-xs text-blue-600">
                今日: {metrics.todaySessions} 个
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={6}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-red-50 to-red-100 border-red-200"
          >
            <Statistic
              title={<Text className="text-red-700 font-bold">高危流失会话</Text>}
              value={metrics?.lossSessionCount || 0}
              prefix={<AlertOutlined className="text-red-500" />}
              valueStyle={{ color: "#dc2626", fontWeight: 900 }}
              suffix={
                metrics?.comparison && (
                  <GrowthIndicator 
                    value={metrics.comparison.lossGrowth} 
                    label="较昨日" 
                  />
                )
              }
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          >
            <Statistic
              title={<Text className="text-green-700 font-bold">质检合格率</Text>}
              value={metrics?.qualityPassRate || 0}
              suffix="%"
              prefix={<SafetyCertificateOutlined className="text-green-500" />}
              valueStyle={{ color: "#059669", fontWeight: 900 }}
            />
            <div className="mt-2">
              <Progress 
                percent={metrics?.qualityPassRate || 0} 
                size="small" 
                strokeColor="#10b981"
                showInfo={false}
              />
            </div>
            {metrics?.comparison && (
              <GrowthIndicator 
                value={metrics.comparison.qualityGrowth} 
                label="较昨日" 
              />
            )}
          </Card>
        </Col>
        
        <Col span={6}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
          >
            <Statistic
              title={<Text className="text-yellow-700 font-bold">敏感词拦截</Text>}
              value={metrics?.sensitiveHitCount || 0}
              prefix={<BulbOutlined className="text-yellow-500" />}
              valueStyle={{ color: "#b45309", fontWeight: 900 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[24, 24]} className="flex-1">
        <Col span={12}>
          <Card
            title={<span className="text-slate-900 font-black">会话趋势（最近7天）</span>}
            bordered={false}
            className="h-full shadow-sm"
            extra={
              <Badge 
                count={metrics?.trends?.length || 0} 
                style={{ backgroundColor: '#52c41a' }}
                title="数据点数量"
              />
            }
          >
            {trendConfig ? (
              <Line {...trendConfig} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                暂无趋势数据
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={12}>
          <Card
            title={<span className="text-slate-900 font-black">流失风险分布</span>}
            bordered={false}
            className="h-full shadow-sm"
            extra={
              <Text className="text-xs text-gray-500">
                总计: {(metrics?.riskBuckets?.high || 0) + (metrics?.riskBuckets?.medium || 0) + (metrics?.riskBuckets?.low || 0)} 个
              </Text>
            }
          >
            {riskPieConfig ? (
              <Pie {...riskPieConfig} />
            ) : (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <Text className="text-slate-600 font-bold">
                    <Badge status="error" text="高风险" />
                  </Text>
                  <Text className="text-slate-900 font-black">
                    {metrics?.riskBuckets?.high || 0}
                  </Text>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <Text className="text-slate-600 font-bold">
                    <Badge status="warning" text="中等风险" />
                  </Text>
                  <Text className="text-slate-900 font-black">
                    {metrics?.riskBuckets?.medium || 0}
                  </Text>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <Text className="text-slate-600 font-bold">
                    <Badge status="success" text="低风险" />
                  </Text>
                  <Text className="text-slate-900 font-black">
                    {metrics?.riskBuckets?.low || 0}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 实时统计和TOP问题 */}
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card
            title={<span className="text-slate-900 font-black">实时统计</span>}
            bordered={false}
            className="shadow-sm"
            extra={
              <Badge 
                status={isConnected ? "processing" : "default"} 
                text={isConnected ? "实时" : "缓存"} 
              />
            }
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">本小时会话</span>
                <span className="text-slate-900 font-black text-lg">
                  {metrics?.realTimeStats?.currentHourSessions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">在线坐席</span>
                <span className="text-slate-900 font-black text-lg">
                  {metrics?.realTimeStats?.onlineAgents || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">平均响应时间</span>
                <span className="text-slate-900 font-black text-lg">
                  {metrics?.realTimeStats?.avgResponseTime || 0}s
                </span>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col span={16}>
          <Card
            title={<span className="text-slate-900 font-black">TOP 高频问题</span>}
            bordered={false}
            className="shadow-sm"
            extra={
              <Text className="text-xs text-gray-500">
                显示前 {Math.min(metrics?.topFaqs?.length || 0, 5)} 个
              </Text>
            }
          >
            <div className="space-y-3">
              {metrics?.topFaqs?.slice(0, 5).map((faq, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <Text className="text-slate-900 font-medium truncate flex-1 mr-4">
                    {index + 1}. {faq.question}
                  </Text>
                  <Badge 
                    count={faq.count} 
                    style={{ 
                      backgroundColor: index < 3 ? '#1890ff' : '#52c41a',
                      minWidth: '40px'
                    }}
                  />
                </div>
              )) || (
                <Text className="text-slate-500 font-medium text-center block py-8">
                  暂无高频问题数据
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
