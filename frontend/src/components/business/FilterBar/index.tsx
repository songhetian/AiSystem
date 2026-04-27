/**
 * FilterBar组件 - 筛选栏
 * 提供统一的筛选功能，支持多种输入类型和展开/收起
 */

import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { FilterBarProps } from './types';
import styles from './index.module.less';

const { RangePicker } = DatePicker;

export const FilterBar: React.FC<FilterBarProps> = ({
  items,
  initialValues,
  collapsible = false,
  defaultRows = 1,
  glass = false,
  searchText = '查询',
  resetText = '重置',
  onSearch,
  onReset,
  onChange,
  className,
  style,
}) => {
  const [form] = Form.useForm();
  const [collapsed, setCollapsed] = useState(collapsible);

  const filterBarClass = classNames(
    styles.filterBar,
    {
      [styles.glass]: glass,
      [styles.collapsed]: collapsed,
    },
    className
  );

  // 计算显示的筛选项
  const visibleItems = collapsed ? items.slice(0, defaultRows * 3) : items;

  const handleSearch = () => {
    form.validateFields().then((values) => {
      onSearch?.(values);
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset?.();
  };

  const handleValuesChange = (changedValues: any, allValues: any) => {
    onChange?.(allValues);
  };

  const renderFilterItem = (item: any) => {
    switch (item.type) {
      case 'input':
        return (
          <Input
            placeholder={item.placeholder || `请输入${item.label}`}
            allowClear
          />
        );

      case 'select':
        return (
          <Select
            placeholder={item.placeholder || `请选择${item.label}`}
            options={item.options}
            allowClear
          />
        );

      case 'date':
        return (
          <DatePicker
            placeholder={item.placeholder || `请选择${item.label}`}
            style={{ width: '100%' }}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            style={{ width: '100%' }}
          />
        );

      case 'custom':
        return item.render?.();

      default:
        return null;
    }
  };

  return (
    <div className={filterBarClass} style={style}>
      <Form
        form={form}
        layout="inline"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
        className={styles.form}
      >
        <div className={styles.formItems}>
          {visibleItems.map((item) => (
            <Form.Item
              key={item.name}
              name={item.name}
              label={item.label}
              rules={item.required ? [{ required: true, message: `请输入${item.label}` }] : []}
              className={styles.formItem}
            >
              {renderFilterItem(item)}
            </Form.Item>
          ))}
        </div>

        <div className={styles.actions}>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              {searchText}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              {resetText}
            </Button>
            {collapsible && items.length > defaultRows * 3 && (
              <Button
                type="link"
                onClick={() => setCollapsed(!collapsed)}
                icon={collapsed ? <DownOutlined /> : <UpOutlined />}
              >
                {collapsed ? '展开' : '收起'}
              </Button>
            )}
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default FilterBar;
