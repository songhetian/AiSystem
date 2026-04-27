import React from 'react';
import { Drawer, Descriptions, Tag, Typography, Card, Space } from 'antd';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

export interface LogDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  record: any;
  detailType: 'operation' | 'login';
}

/**
 * 日志详情抽屉组件（可复用）
 * 支持操作日志和登录日志两种类型
 */
export const LogDetailDrawer: React.FC<LogDetailDrawerProps> = ({
  visible,
  onClose,
  record,
  detailType,
}) => {
  if (!record) return null;

  // 渲染操作日志详情
  const renderOperationDetail = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="基本信息" size="small">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="操作时间">
            {dayjs(record.create_time).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="操作人">
            {record.operator_name || record.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="操作模块">
            {record.operation_module || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="请求方式">
            <Tag color={getMethodColor(record.request_method)}>
              {record.request_method}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="操作接口">
            {record.api_path}
          </Descriptions.Item>
          <Descriptions.Item label="操作状态">
            <Tag color={record.operation_status === 1 ? 'success' : 'error'}>
              {record.operation_status === 1 ? '成功' : '失败'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="执行时间">
            {record.execution_time ? `${record.execution_time}ms` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="操作IP">
            {record.request_ip || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="操作描述">
            {record.operation_message || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {record.request_params && (
        <Card title="请求参数" size="small">
          <Paragraph>
            <pre style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {JSON.stringify(record.request_params, null, 2)}
            </pre>
          </Paragraph>
        </Card>
      )}

      {record.response_summary && (
        <Card title="响应摘要" size="small">
          <Paragraph>
            <pre style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {JSON.stringify(record.response_summary, null, 2)}
            </pre>
          </Paragraph>
        </Card>
      )}

      {record.diff_content && record.diff_content.length > 0 && (
        <Card title="字段变更详情" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {record.diff_content.map((change: any, index: number) => (
              <Card key={index} size="small" type="inner">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="字段名称">
                    <Text strong>{change.fieldName || change.field}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="旧值">
                    <Text delete type="danger">
                      {change.oldName || formatValue(change.oldValue)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="新值">
                    <Text type="success">
                      {change.newName || formatValue(change.newValue)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      <Card title="其他信息" size="small">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="所属平台">
            {record.platform_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属部门">
            {record.dept_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属店铺">
            {record.shop_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="用户代理">
            <Text ellipsis style={{ maxWidth: '100%' }}>
              {record.user_agent || '-'}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  // 渲染登录日志详情
  const renderLoginDetail = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="基本信息" size="small">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="登录时间">
            {dayjs(record.create_time).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="登录人">
            {record.operator_name || record.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="用户名">
            {record.username}
          </Descriptions.Item>
          <Descriptions.Item label="登录IP">
            {record.login_ip || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="登录方式">
            <Tag color={getLoginMethodColor(record.login_method)}>
              {getLoginMethodText(record.login_method)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="设备类型">
            <Tag color={getDeviceTypeColor(record.device_type)}>
              {getDeviceTypeText(record.device_type)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="登录状态">
            <Tag color={record.login_status === 1 ? 'success' : 'error'}>
              {record.login_status === 1 ? '成功' : '失败'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="结果描述">
            {record.login_message || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="其他信息" size="small">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="所属平台">
            {record.platform_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属部门">
            {record.dept_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="所属店铺">
            {record.shop_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="用户代理">
            <Paragraph ellipsis={{ rows: 3, expandable: true }}>
              {record.user_agent || '-'}
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  return (
    <Drawer
      title={detailType === 'operation' ? '操作日志详情' : '登录日志详情'}
      placement="right"
      width={720}
      onClose={onClose}
      open={visible}
    >
      {detailType === 'operation' ? renderOperationDetail() : renderLoginDetail()}
    </Drawer>
  );
};

// 辅助函数
const getMethodColor = (method: string) => {
  const colorMap: Record<string, string> = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
  };
  return colorMap[method] || 'default';
};

const getLoginMethodColor = (method: string) => {
  const colorMap: Record<string, string> = {
    password: 'blue',
    sms: 'green',
    wechat: 'orange',
  };
  return colorMap[method] || 'blue';
};

const getLoginMethodText = (method: string) => {
  const textMap: Record<string, string> = {
    password: '密码登录',
    sms: '短信登录',
    wechat: '微信登录',
  };
  return textMap[method] || '密码登录';
};

const getDeviceTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    pc: 'blue',
    mobile: 'green',
    tablet: 'orange',
  };
  return colorMap[type] || 'blue';
};

const getDeviceTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    pc: 'PC',
    mobile: '移动端',
    tablet: '平板',
  };
  return textMap[type] || 'PC';
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
