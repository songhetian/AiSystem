/**
 * Drawer组件 - 抽屉
 * 基于Ant Design Drawer封装，支持毛玻璃效果
 */

import React from 'react';
import { Drawer as AntDrawer } from 'antd';
import classNames from 'classnames';
import { DrawerProps } from './types';
import styles from './index.module.less';

export const Drawer: React.FC<DrawerProps> = ({
  visible,
  title,
  children,
  glass = true,
  width = 520,
  height = 520,
  placement = 'right',
  closable = true,
  mask = true,
  maskClosable = true,
  footer,
  extra,
  onClose,
  className,
  style,
  bodyStyle,
  headerStyle,
  footerStyle,
  ...restProps
}) => {
  const drawerClass = classNames(
    styles.drawer,
    {
      [styles.glass]: glass,
    },
    className
  );

  return (
    <AntDrawer
      open={visible}
      title={title}
      width={width}
      height={height}
      placement={placement}
      closable={closable}
      mask={mask}
      maskClosable={maskClosable}
      footer={footer}
      extra={extra}
      onClose={onClose}
      className={drawerClass}
      style={style}
      bodyStyle={bodyStyle}
      headerStyle={headerStyle}
      footerStyle={footerStyle}
      {...restProps}
    >
      {children}
    </AntDrawer>
  );
};

export default Drawer;
