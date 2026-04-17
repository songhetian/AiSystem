import { Empty, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import React from "react";

interface EmptyStateProps {
  description?: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreate?: () => void;
  image?: React.ReactNode;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * 空状态组件 - 为空列表提供友好的提示和操作
 *
 * @param description - 空状态描述文字
 * @param showCreateButton - 是否显示创建按钮
 * @param createButtonText - 创建按钮文字
 * @param onCreate - 创建按钮点击回调
 * @param image - 自定义空状态图片
 * @param style - 自定义样式
 * @param children - 自定义操作按钮（会覆盖默认的创建按钮）
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  description = "暂无数据",
  showCreateButton = true,
  createButtonText = "创建第一条记录",
  onCreate,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  style,
  children,
}) => {
  return (
    <Empty
      image={image}
      description={description}
      style={{ marginTop: 100, ...style }}
    >
      {children ||
        (showCreateButton && onCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {createButtonText}
          </Button>
        ))}
    </Empty>
  );
};
