import React, { useState } from 'react';
import { Space, Button, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  confirm?: string; // 如果提供，则显示确认气泡
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  tooltip?: string;
  hidden?: boolean;
}

interface LeixiActionGroupProps {
  actions: ActionItem[];
  maxCount?: number; // 超过多少个进入“更多”菜单（可选扩展）
}

const LeixiActionGroup: React.FC<LeixiActionGroupProps> = ({ actions, maxCount = 3 }) => {
  const visibleActions = actions.filter(a => !a.hidden);

  const renderAction = (action: ActionItem) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
      if (action.onClick) {
        setLoading(true);
        try {
          await action.onClick();
        } finally {
          setLoading(false);
        }
      }
    };

    const btn = (
      <Button
        type="link"
        size="small"
        danger={action.danger}
        loading={loading}
        disabled={action.disabled}
        onClick={action.confirm ? undefined : handleClick}
        icon={action.icon}
        className={`font-black p-0 ${!action.danger && !action.disabled ? 'text-slate-900 hover:text-blue-600' : ''}`}
      >
        {action.label}
      </Button>
    );

    const content = action.tooltip ? <Tooltip title={action.tooltip}>{btn}</Tooltip> : btn;

    if (action.confirm) {
      return (
        <Popconfirm
          key={action.key}
          title={<span className="font-black text-slate-900">{action.confirm}</span>}
          description="此操作执行后可能无法撤回。"
          onConfirm={handleClick}
          okText="确定"
          cancelText="取消"
          okButtonProps={{ className: 'bg-slate-900 border-none font-black rounded-lg' }}
          cancelButtonProps={{ className: 'font-bold rounded-lg' }}
        >
          {content}
        </Popconfirm>
      );
    }

    return <React.Fragment key={action.key}>{content}</React.Fragment>;
  };

  return (
    <Space size="middle">
      {visibleActions.map(renderAction)}
    </Space>
  );
};

export default LeixiActionGroup;
