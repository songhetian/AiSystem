import React from 'react';

export default function MaintenancePage() {
  console.log('MaintenancePage rendered');
  return (
    <div style={{ padding: '20px', fontSize: '18px', textAlign: 'center' }}>
      <h1>系统维护中</h1>
      <p>系统正在维护，请稍后再试</p>
    </div>
  );
}
