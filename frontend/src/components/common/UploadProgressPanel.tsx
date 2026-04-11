import React from 'react';
import { List, Progress, Tag } from 'antd';

export interface UploadingFile {
  uid: string;
  name: string;
  percent: number;
  status: 'uploading' | 'success' | 'error';
}

interface UploadProgressPanelProps {
  files: UploadingFile[];
}

const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
          正在上传文件 ({files.length})
        </h4>
      </div>
      <List
        dataSource={files}
        renderItem={item => (
          <div key={item.uid} className="flex items-center space-x-4 mb-3 last:mb-0">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-slate-900 truncate pr-4">{item.name}</span>
                <span className="text-[10px] font-black text-slate-400">{item.percent}%</span>
              </div>
              <Progress 
                percent={item.percent} 
                size="small" 
                showInfo={false} 
                strokeColor={{
                  '0%': '#3b82f6',
                  '100%': '#0f172a',
                }}
                className="m-0"
              />
            </div>
            <Tag color={item.status === 'success' ? 'success' : item.status === 'error' ? 'error' : 'processing'} className="font-black m-0 border-none px-3 rounded-lg text-[10px]">
              {item.status.toUpperCase()}
            </Tag>
          </div>
        )}
      />
    </div>
  );
};

export default UploadProgressPanel;
