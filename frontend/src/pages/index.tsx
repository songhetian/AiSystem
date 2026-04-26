import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { UserOutlined, RobotOutlined, CheckCircleOutlined, DashboardOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function IndexPage() {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>工作台</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="在线用户"
              value={12}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="AI 助手状态"
              value="运行中"
              valueStyle={{ color: '#3f8600' }}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="今日处理请求"
              value={1254}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="系统版本"
              value="V1.2.0"
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="欢迎回来" style={{ marginTop: '24px' }} bordered={false}>
        <p>欢迎使用雷犀AI客服管理系统，在这里您可以管理系统用户、配置AI能力并监控实时数据。</p>
        <p>请点击左侧菜单开始您的工作。</p>
      </Card>
    </div>
  );
}
