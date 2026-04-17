import React from "react";
import { Result, Button } from "antd";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * 错误边界组件 - 捕获子组件的错误并显示友好的错误页面
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] 捕获到错误:", error, errorInfo);

    // 可以在这里上报错误到监控系统
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误页面
      return (
        <Result
          status="error"
          title="页面出错了"
          subTitle={
            process.env.NODE_ENV === "development"
              ? this.state.error?.message
              : "抱歉，页面遇到了一些问题"
          }
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              刷新页面
            </Button>,
            <Button key="reset" onClick={this.handleReset}>
              返回
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}
