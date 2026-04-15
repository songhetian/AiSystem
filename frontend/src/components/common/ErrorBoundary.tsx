import React from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * 全局错误边界组件 (V1.0)
 * 职责：捕获React组件树中的错误，防止整个应用崩溃
 * 
 * 功能：
 * 1. 捕获组件渲染错误
 * 2. 显示友好的错误提示
 * 3. 上报错误到后端（可选）
 * 4. 提供刷新页面功能
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 上报错误到后端（生产环境）
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * 上报错误到后端
   */
  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      fetch('/api/v1/system/frontend-error-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.error('Failed to report error:', err);
      });
    } catch (err) {
      console.error('Error in reportError:', err);
    }
  }

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /**
   * 刷新页面
   */
  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px',
        }}>
          <Result
            status="error"
            title="页面出现错误"
            subTitle={
              process.env.NODE_ENV === 'development' 
                ? this.state.error?.message 
                : '抱歉，页面加载失败，请刷新重试'
            }
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                返回上一页
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ 
                textAlign: 'left', 
                maxWidth: '800px', 
                margin: '20px auto',
                padding: '20px',
                background: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
              }}>
                <h4>错误堆栈：</h4>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <h4>组件堆栈：</h4>
                    <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
