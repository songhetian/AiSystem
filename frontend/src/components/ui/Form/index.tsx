/**
 * Form组件 - 表单
 * 基于Ant Design Form封装，支持毛玻璃效果
 */

import React from 'react';
import { Form as AntForm } from 'antd';
import classNames from 'classnames';
import { FormProps, FormItemProps } from './types';
import styles from './index.module.less';

export const Form: React.FC<FormProps> & {
  Item: React.FC<FormItemProps>;
  useForm: typeof AntForm.useForm;
  List: typeof AntForm.List;
} = ({
  layout = 'vertical',
  size = 'middle',
  glass = false,
  labelAlign = 'right',
  labelCol,
  wrapperCol,
  colon = false,
  initialValues,
  onFinish,
  onFinishFailed,
  onValuesChange,
  className,
  style,
  children,
  ...restProps
}) => {
  const formClass = classNames(
    styles.form,
    {
      [styles.glass]: glass,
      [styles[`layout-${layout}`]]: layout,
    },
    className
  );

  return (
    <AntForm
      layout={layout}
      size={size}
      labelAlign={labelAlign}
      labelCol={labelCol}
      wrapperCol={wrapperCol}
      colon={colon}
      initialValues={initialValues}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      onValuesChange={onValuesChange}
      className={formClass}
      style={style}
      {...restProps}
    >
      {children}
    </AntForm>
  );
};

// FormItem组件
const FormItem: React.FC<FormItemProps> = ({
  name,
  label,
  required = false,
  rules = [],
  tooltip,
  extra,
  hidden = false,
  labelAlign,
  labelCol,
  wrapperCol,
  className,
  style,
  children,
  ...restProps
}) => {
  const itemClass = classNames(styles.formItem, className);

  // 如果设置了required，自动添加必填规则
  const finalRules = required && !rules.some((rule: any) => rule.required)
    ? [{ required: true, message: `请输入${label}` }, ...rules]
    : rules;

  return (
    <AntForm.Item
      name={name}
      label={label}
      rules={finalRules}
      tooltip={tooltip}
      extra={extra}
      hidden={hidden}
      labelAlign={labelAlign}
      labelCol={labelCol}
      wrapperCol={wrapperCol}
      className={itemClass}
      style={style}
      {...restProps}
    >
      {children}
    </AntForm.Item>
  );
};

Form.Item = FormItem;
Form.useForm = AntForm.useForm;
Form.List = AntForm.List;

export default Form;
