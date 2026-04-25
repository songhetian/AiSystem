import React from 'react';

export default function IndexPage() {
  console.log('IndexPage rendered at:', new Date().toISOString());
  
  // 检查localStorage
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser');
  
  console.log('Token:', token ? 'exists' : 'none');
  console.log('CurrentUser:', currentUser ? 'exists' : 'none');
  
  return (
    <div style={{ 
      padding: '40px', 
      fontSize: '18px',
      background: '#f0f2f5',
      minHeight: '100vh'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1890ff', marginBottom: '20px' }}>🎉 雷犀AI客服系统</h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
          欢迎使用雷犀AI客服系统！系统已成功启动。
        </p>
        
        <div style={{ 
          background: '#f6f8fa', 
          padding: '20px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>📊 系统状态</h3>
          <p>✅ 前端服务: 正常运行</p>
          <p>✅ 路由系统: 正常工作</p>
          <p>✅ 页面渲染: 成功</p>
          <p>🕐 当前时间: {new Date().toLocaleString('zh-CN')}</p>
        </div>

        <div style={{ 
          background: '#fff7e6', 
          padding: '20px', 
          borderRadius: '4px',
          border: '1px solid #ffd591',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#fa8c16' }}>🔐 登录状态</h3>
          <p>Token: {token ? '✅ 已登录' : '❌ 未登录'}</p>
          <p>用户信息: {currentUser ? '✅ 已加载' : '❌ 未加载'}</p>
        </div>

        <div style={{ 
          background: '#e6f7ff', 
          padding: '20px', 
          borderRadius: '4px',
          border: '1px solid #91d5ff'
        }}>
          <h3 style={{ marginTop: 0, color: '#1890ff' }}>🚀 快速开始</h3>
          <p>1. 如果未登录，请访问 <a href="/login" style={{ color: '#1890ff' }}>/login</a> 登录</p>
          <p>2. 登录后可以访问系统各个功能模块</p>
          <p>3. 查看 <a href="/system/users" style={{ color: '#1890ff' }}>用户管理</a></p>
          <p>4. 查看 <a href="/system/ai-config" style={{ color: '#1890ff' }}>AI配置</a></p>
        </div>

        <div style={{ marginTop: '30px', fontSize: '14px', color: '#999', textAlign: 'center' }}>
          <p>如果看到这个页面，说明前端系统运行正常 ✨</p>
          <p>Version: 1.0.0 | Build: {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}
