/**
 * Task 14.2: 登录日志搜索组件
 * Requirements: 13.2, 13.3, 14.1, 14.2
 *
 * 功能:
 * - 实现搜索表单 (用户名模糊搜索、设备模糊搜索、时间范围选择器)
 * - 实现搜索条件重置功能
 * - 实现搜索异常提示 (时间范围不合理、关键词过长)
 * - 集成后端查询接口
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, Space, Row, Col, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

export interface LoginLogSearchProps {
  onSearch: (values: any) => void;
  onReset: () => void;
  loading?: boolean;
}

/**
 * 登录日志搜索组件
 * 支持多条件组合搜索
 */
export const LoginLogSearch: React.FC<LoginLogSearchProps> = ({
  onSearch,
  onReset,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [platforms, setPlatforms] = useState<any[]>([]);

  // 加载平台列表
  useEffect(() => {
    // TODO: 从后端加载平台选项数据
    // loadPlatforms();
  }, []);

  // Requirement 13.2: 实现搜索表单提交
  const handleSubmit = (values: any) => {
    // Requirement 14.4: 关键词长度限制 (50字符)
    if (values.username && values.username.length > 50) {
      message.warning('搜索关键词过长，已自动截取前50个字符');
      values.username = values.username.slice(0, 50);
    }

    if (values.user_agent && values.user_agent.length > 50) {
      message.warning('设备关键词过长，已自动截取前50个字符');
      values.user_agent = values.user_agent.slice(0, 50);
    }

    // Requirement 14.2: 时间范围验证
    if (values.dateRange && values.dateRange.length === 2) {
      const [startDate, endDate] = values.dateRange;
      if (startDate.isAfter(endDate)) {
        message.info('时间范围不合理，已自动修正（开始日期 > 结束日期）');
        values.dateRange = [endDate, startDate];
      }
    }

    // 转换日期范围为后端需要的格式
    const searchValues = {
      ...values,
      start_date: values.dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      end_date: values.dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
    };
    delete searchValues.dateRange;

    onSearch(searchValues);
  };

  // Requirement 13.2: 实现搜索条件重置功能
  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        // Requirement 14.1: 默认展示最近30天日志
        dateRange: [dayjs().subtract(30, 'days'), dayjs()],
      }}
    >
      <Row gutter={16}>
        {/* Requirement 13.2: 用户名模糊搜索 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item
            name="username"
            label="登录用户"
            tooltip="支持模糊搜索，最多50个字符"
          >
            <Input
              placeholder="请输入用户名"
              allowClear
              maxLength={50}
            />
          </Form.Item>
        </Col>

        {/* Requirement 13.2: 时间范围选择器 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item
            name="dateRange"
            label="登录时间"
            tooltip="选择登录时间范围"
          >
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>
        </Col>

        {/* Requirement 13.3: 登录结果筛选 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="status" label="登录结果">
            <Select placeholder="请选择登录结果" allowClear>
              <Option value={1}>成功</Option>
              <Option value={0}>失败</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Requirement 13.2: 设备模糊搜索 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item
            name="user_agent"
            label="登录设备"
            tooltip="支持模糊搜索，最多50个字符"
          >
            <Input
              placeholder="请输入设备信息"
              allowClear
              maxLength={50}
            />
          </Form.Item>
        </Col>

        {/* Requirement 13.3: 平台筛选 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="platform_id" label="所属平台">
            <Select
              placeholder="请选择平台"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {platforms.map((platform) => (
                <Option key={platform.id} value={platform.id}>
                  {platform.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* 操作按钮 */}
        <Col xs={24} sm={24} md={24} lg={6}>
          <Form.Item label=" ">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={loading}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default LoginLogSearch;
