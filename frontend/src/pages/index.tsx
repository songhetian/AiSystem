import React from 'react';

export default function IndexPage() {
  console.log('IndexPage rendered');
  return (
    <div style={{ padding: '20px', fontSize: '18px' }}>
      <h1>首页</h1>
      <p>如果你看到这个页面，说明 Umi 路由正常工作</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </div>
  );
}
