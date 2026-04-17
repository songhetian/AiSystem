import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

interface GlobalLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  tip?: string;
  minHeight?: string | number;
}

/**
 * 全局加载状态组件
 * @param loading 是否显示加载状态
 * @param children 子组件
 * @param tip 加载提示文字
 * @param minHeight 最小高度，默认 400px
 */
export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  loading,
  children,
  tip = "加载中...",
  minHeight = "400px",
}) => {
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
