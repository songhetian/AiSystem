import React from 'react';
import { Row, Col, Button, Badge, Space } from 'antd';
import { Link, useNavigate } from '@umijs/max';
import {
  UserOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  RightOutlined,
  MessageOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { Card } from '@/components/ui/Card';
import { MetricsCard } from '@/components/business/MetricsCard';
import { PageHeader } from '@/components/business/PageHeader';

export default function IndexPage() {
  return (
    <div style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <PageHeader
        title="个人工作台"
        subTitle="欢迎回来，这是您今日的业务概览"
        extra={
          <Link to="/service/dashboard">
            <Button
              type="primary"
              icon={<DashboardOutlined />}
            >
              进入实时大屏
            </Button>
          </Link>
        }
      />

      {/* 指标卡片区 */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={6}>
          <MetricsCard
            title="在线用户数"
            value={12}
            icon={<UserOutlined />}
            iconColor="primary"
            trend="up"
            trendValue={5.2}
            trendText="较昨日"
            glass
          />
        </Col>
        <Col span={6}>
          <MetricsCard
            title="AI 质检引擎状态"
            value="健康"
            icon={<ThunderboltOutlined />}
            iconColor="success"
            glass
          />
        </Col>
        <Col span={6}>
          <MetricsCard
            title="今日处理请求"
            value={1254}
            icon={<CheckCircleOutlined />}
            iconColor="success"
            trend="up"
            trendValue={12.5}
            trendText="较昨日"
            glass
          />
        </Col>
        <Col span={6}>
          <MetricsCard
            title="系统运行版本"
            value="V1.2.0"
            icon={<DashboardOutlined />}
            iconColor="info"
            glass
          />
        </Col>
      </Row>

      {/* 快速开始和系统通知 */}
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={16}>
          <Card
            title="快速开始"
            extra={
              <Button type="link" size="small">
                更多功能 <RightOutlined />
              </Button>
            }
            glass
            shadow="md"
            radius="lg"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Link to="/service/sessions" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(100, 116, 139, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(100, 116, 139, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.1)';
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>会话质检列表</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        查看并分析所有的在线客服会话记录
                      </div>
                    </Space>
                  </div>
                </Link>
              </Col>
              <Col span={12}>
                <Link to="/system/users" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(100, 116, 139, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(100, 116, 139, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 116, 139, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.1)';
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TeamOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>系统成员管理</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        管理企业内部成员权限与角色配置
                      </div>
                    </Space>
                  </div>
                </Link>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="系统通知"
            glass
            shadow="md"
            radius="lg"
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  fontSize: '13px',
                }}
              >
                <Badge status="processing" />
                <span style={{ marginLeft: '8px', color: '#475569' }}>
                  AI 质检引擎已升级至 V2.1 版本
                </span>
              </div>
              <div
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                  fontSize: '13px',
                }}
              >
                <Badge status="warning" />
                <span style={{ marginLeft: '8px', color: '#475569' }}>
                  有 3 条高危会话等待处理
                </span>
              </div>
              <div
                style={{
                  padding: '12px 0',
                  fontSize: '13px',
                }}
              >
                <Badge status="default" />
                <span style={{ marginLeft: '8px', color: '#475569' }}>
                  系统例行维护完成
                </span>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
