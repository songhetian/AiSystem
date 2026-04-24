import React from 'react';

export default function TestPage() {
  console.log('TestPage rendered');

  // 测试环境变量
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  });

  return (
    <div style={{ padding: '20px', fontSize: '24px', color: 'red' }}>
      <h1>测试页面</h1>
      <p>如果你看到这个页面，说明 React 应用正常工作</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
      <p>API_BASE_URL: {process.env.VITE_API_BASE_URL}</p>
    </div>
  );
}
