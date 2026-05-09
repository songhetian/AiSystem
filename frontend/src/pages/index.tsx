/**
 * 个人工作台（优化版）
 * 按照企业级实战标准重构，提供高密度的业务概览和沉浸式体验
 */

import React from 'react';
import { Row, Col, Badge, Space } from 'antd';
import { Link } from '@umijs/max';
import {
  UserOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  RightOutlined,
  MessageOutlined,
  TeamOutlined,
  BellOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { PageContainer, SectionCard } from '@/components/layout';
import { MetricsCard } from '@/components/business';
import { Button, Card } from '@/components/ui';

export default function IndexPage() {
  return (
    <PageContainer
      title="个人工作台"
      subTitle="欢迎回来，雷犀 AI 质检引擎正在为您保驾护航"
      extra={
        <Link to="/service/dashboard">
          <Button
            type="primary"
            icon={<DashboardOutlined />}
            glass
          >
            进入实时大屏
          </Button>
        </Link>
      }
    >
      {/* 核心指标概览 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <MetricsCard
            title="当前在线用户"
            value="12"
            unit="人"
            icon={<UserOutlined />}
            iconColor="primary"
            trend="up"
            trendValue={5.2}
            trendText="较昨日"
            glass
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricsCard
            title="质检引擎负载"
            value="健康"
            icon={<ThunderboltOutlined />}
            iconColor="success"
            glass
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricsCard
            title="今日处理请求"
            value="1,254"
            unit="次"
            icon={<CheckCircleOutlined />}
            iconColor="success"
            trend="up"
            trendValue={12.5}
            trendText="较昨日"
            glass
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <MetricsCard
            title="系统运行版本"
            value="V2.5.0"
            icon={<RocketOutlined />}
            iconColor="info"
            glass
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* 快速开始矩阵 */}
        <Col xs={24} lg={16}>
          <SectionCard
            title="快速功能导航"
            extra={
              <Button type="link" size="small">
                查看全部 <RightOutlined />
              </Button>
            }
            glass
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Link to="/service/sessions" style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    style={{ background: 'rgba(248, 250, 252, 0.5)', border: '1px solid rgba(226, 232, 240, 0.8)' }}
                  >
                    <Space size={12}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MessageOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>会话质检列表</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>分析在线客服会话质量与风险</div>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </Col>
              <Col span={12}>
                <Link to="/system/users" style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    style={{ background: 'rgba(248, 250, 252, 0.5)', border: '1px solid rgba(226, 232, 240, 0.8)' }}
                  >
                    <Space size={12}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <TeamOutlined style={{ fontSize: 20, color: '#10b981' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>系统成员管理</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>管理企业内部成员权限与角色</div>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </Col>
              <Col span={12}>
                <Link to="/attendance/records" style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    style={{ background: 'rgba(248, 250, 252, 0.5)', border: '1px solid rgba(226, 232, 240, 0.8)' }}
                  >
                    <Space size={12}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CheckCircleOutlined style={{ fontSize: 20, color: '#ef4444' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>考勤记录查询</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>查看每日员工考勤与打卡详情</div>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </Col>
              <Col span={12}>
                <Link to="/approval/requests" style={{ textDecoration: 'none' }}>
                  <Card
                    hoverable
                    style={{ background: 'rgba(248, 250, 252, 0.5)', border: '1px solid rgba(226, 232, 240, 0.8)' }}
                  >
                    <Space size={12}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: '#faf5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ThunderboltOutlined style={{ fontSize: 20, color: '#a855f7' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>我的审批申请</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>处理各类办公申请与流程审批</div>
                      </div>
                    </Space>
                  </Card>
                </Link>
              </Col>
            </Row>
          </SectionCard>
        </Col>

        {/* 系统动态与通知 */}
        <Col xs={24} lg={8}>
          <SectionCard
            title="系统实时动态"
            icon={<BellOutlined />}
            glass
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge status="processing" style={{ marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>AI 质检引擎升级成功</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>V2.5.0 版本已上线，新增情感分析模型。</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>10 分钟前</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge status="error" style={{ marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>高危风险会话预警</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>命中“严重投诉”敏感词，请立即处理。</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>25 分钟前</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge status="success" style={{ marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>昨日考勤报表已生成</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>已完成 452 名员工的自动化考勤核算。</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>2 小时前</div>
                </div>
              </div>
            </Space>
          </SectionCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
