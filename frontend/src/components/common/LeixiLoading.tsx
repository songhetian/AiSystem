import React from 'react';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LeixiLoadingProps {
  tip?: string;
  fullPage?: boolean;
}

export const LeixiLoading: React.FC<LeixiLoadingProps> = ({ 
  tip = '系统正在全力调取大数据，请稍候...', 
  fullPage = false 
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="leixi-loading-pulse mb-6">
        <LoadingOutlined style={{ fontSize: 48, color: '#0f172a' }} spin />
      </div>
      <Text className="text-slate-900 font-black text-lg tracking-widest uppercase">
        {tip}
      </Text>
      <div className="mt-4 w-64 h-1 rounded-full overflow-hidden bg-slate-100">
        <div className="leixi-shimmer h-full w-full" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};
