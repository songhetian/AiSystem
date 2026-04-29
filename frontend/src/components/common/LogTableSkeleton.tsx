/**
 * 日志表格骨架屏组件
 * Task 17.2: 实现加载状态提示 - 列表加载骨架屏
 * Requirements: 15.1, 17.1, 18.1
 *
 * 在日志列表加载时显示骨架屏，提升用户体验
 */

import React from 'react';
import { Skeleton, Card } from 'antd';

interface LogTableSkeletonProps {
  rows?: number;  // 显示的骨架行数
  columns?: number;  // 显示的骨架列数
}

/**
 * 日志表格骨架屏
 */
export const LogTableSkeleton: React.FC<LogTableSkeletonProps> = ({
  rows = 10,
  columns = 8,
}) => {
  return (
    <div style={{ padding: '16px 0' }}>
      {/* 表头骨架 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '12px',
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: '8px 8px 0 0',
          marginBottom: '1px',
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton.Input
            key={`header-${index}`}
            active
            size="small"
            style={{ width: '100%', height: '20px' }}
          />
        ))}
      </div>

      {/* 表格行骨架 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '12px',
            padding: '16px',
            background: rowIndex % 2 === 0 ? '#fff' : '#fafafa',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton.Input
              key={`cell-${rowIndex}-${colIndex}`}
              active
              size="small"
              style={{
                width: colIndex === 0 ? '80%' : '90%',
                height: '16px',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 日志详情骨架屏
 */
export const LogDetailSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      {/* 基本信息 */}
      <div style={{ marginBottom: '32px' }}>
        <Skeleton.Input
          active
          size="small"
          style={{ width: '120px', height: '20px', marginBottom: '16px' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <React.Fragment key={`detail-${index}`}>
              <Skeleton.Input active size="small" style={{ width: '100%', height: '16px' }} />
              <Skeleton.Input active size="small" style={{ width: '60%', height: '16px' }} />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 详细信息 */}
      <div>
        <Skeleton.Input
          active
          size="small"
          style={{ width: '120px', height: '20px', marginBottom: '16px' }}
        />
        <Skeleton paragraph={{ rows: 4 }} active />
      </div>
    </div>
  );
};

/**
 * 搜索表单骨架屏
 */
export const LogSearchSkeleton: React.FC = () => {
  return (
    <Card style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`search-${index}`}>
            <Skeleton.Input
              active
              size="small"
              style={{ width: '80px', height: '16px', marginBottom: '8px' }}
            />
            <Skeleton.Input active size="default" style={{ width: '100%' }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Skeleton.Button active size="default" style={{ width: '80px' }} />
        <Skeleton.Button active size="default" style={{ width: '80px' }} />
      </div>
    </Card>
  );
};

export default LogTableSkeleton;
