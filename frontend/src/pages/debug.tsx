import React from 'react';

// 最简单的调试页面，不依赖任何复杂组件
export default function DebugPage() {
  // 在页面加载时立即输出调试信息
  console.log('=== DEBUG PAGE LOADED ===');
  console.log('React version:', React.version);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', process.env.VITE_API_BASE_URL);
  console.log('Window location:', window.location.href);
  console.log('=== DEBUG INFO END ===');

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f0f0f0',
      border: '2px solid red',
      fontSize: '16px',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: 'red' }}>🔧 调试页面</h1>
      <p><strong>如果你看到这个页面，说明React应用已经启动！</strong></p>
      <hr />
      <p>React版本: {React.version}</p>
      <p>环境: {process.env.NODE_ENV}</p>
      <p>API地址: {process.env.VITE_API_BASE_URL}</p>
      <p>当前URL: {window.location.href}</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
      <hr />
      <p style={{ color: 'green' }}>✅ React应用正常工作</p>
    </div>
  );
}
