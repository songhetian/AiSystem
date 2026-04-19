import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

interface GlobalLoadingProps {
  loading: boolean;
  children?: React.ReactNode;
  tip?: string;
  minHeight?: string | number;
}

/**
 * 全局加载状态组件
 * @param loading 是否显示加载状态
 * @param children 子组件（可选）
 * @param tip 加载提示文字
 * @param minHeight 最小高度，默认 400px（仅在有 children 时生效）
 */
export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  loading,
  children,
  tip = "加载中...",
  minHeight = "400px",
}) => {
  // 无 children 时作为独立 loading 指示器使用
  if (!children) {
    if (!loading) return null;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px 0",
        }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight,
          flexDirection: "column",
        }}
      >
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
          tip={tip}
        />
      </div>
    );
  }
  return <>{children}</>;
};

export default GlobalLoading;
