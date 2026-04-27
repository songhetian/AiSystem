import React from 'react';
import { Form, Input, Select, DatePicker, Button, Space, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export interface LogFilterProps {
  onFilter: (values: any) => void;
  filterType: 'operation' | 'login';
  loading?: boolean;
}

/**
 * 日志筛选组件（可复用）
 * 支持操作日志和登录日志两种类型
 */
export const LogFilter: React.FC<LogFilterProps> = ({ onFilter, filterType, loading }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    const filterValues = {
      ...values,
      start_date: values.dateRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      end_date: values.dateRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
    };
    delete filterValues.dateRange;
    onFilter(filterValues);
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({});
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        dateRange: [dayjs().subtract(30, 'days'), dayjs()],
      }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="username" label="用户名">
            <Input placeholder="请输入用户名" allowClear />
          </Form.Item>
        </Col>

        {filterType === 'operation' && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Form.Item name="module" label="操作模块">
              <Input placeholder="请输入模块名称" allowClear />
            </Form.Item>
          </Col>
        )}

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear>
              <Select.Option value={1}>成功</Select.Option>
              <Select.Option value={0}>失败</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="dateRange" label="时间范围">
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="搜索关键词" allowClear />
          </Form.Item>
        </Col>

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
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
