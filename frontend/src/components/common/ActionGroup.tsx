import React from "react";
import { Button, Space, Popconfirm } from "antd";
import { Permission } from "@/components/permission/Permission";

interface ActionItem {
  key: string;
  label: string;
  permission?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  confirm?: {
    title: string;
    onConfirm: () => Promise<void> | void;
  };
}

interface ActionGroupProps {
  actions?: ActionItem[];
  // 保持向后兼容
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  editPermission?: string;
  deletePermission?: string;
  viewPermission?: string;
  dangerText?: string;
}

export function ActionGroup({
  actions,
  onEdit,
  onDelete,
  onView,
  editPermission,
  deletePermission,
  viewPermission,
  dangerText = "确认删除？",
}: ActionGroupProps) {
  // 如果传入了actions数组，则使用新的渲染逻辑
  if (actions && actions.length > 0) {
    return (
      <Space size={0}>
        {actions.map((action) => {
          const actionButton = (
            <Button
              type="link"
              size="small"
              danger={action.danger}
              disabled={action.disabled}
              onClick={action.onClick}
              className={`font-bold ${action.danger ? "" : "text-slate-600"}`}
            >
              {action.label}
            </Button>
          );

          const wrappedWithPermission = action.permission ? (
            <Permission code={action.permission}>
              {action.confirm ? (
                <Popconfirm
                  title={action.confirm.title}
                  onConfirm={action.confirm.onConfirm}
                  okText="确定"
                  cancelText="取消"
                >
                  {actionButton}
                </Popconfirm>
              ) : (
                actionButton
              )}
            </Permission>
          ) : action.confirm ? (
            <Popconfirm
              title={action.confirm.title}
              onConfirm={action.confirm.onConfirm}
              okText="确定"
              cancelText="取消"
            >
              {actionButton}
            </Popconfirm>
          ) : (
            actionButton
          );

          return (
            <React.Fragment key={action.key}>
              {wrappedWithPermission}
            </React.Fragment>
          );
        })}
      </Space>
    );
  }

  // 向后兼容旧的使用方式
  return (
    <Space size={0}>
      {onView && (
        <Permission code={viewPermission}>
          <Button
            type="link"
            size="small"
            onClick={onView}
            className="font-bold text-slate-900"
          >
            查看
          </Button>
        </Permission>
      )}
      {onEdit && (
        <Permission code={editPermission}>
          <Button
            type="link"
            size="small"
            onClick={onEdit}
            className="font-bold text-slate-600"
          >
            编辑
          </Button>
        </Permission>
      )}
      {onDelete && (
        <Permission code={deletePermission}>
          <Popconfirm
            title={dangerText}
            onConfirm={onDelete}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger className="font-bold">
              删除
            </Button>
          </Popconfirm>
        </Permission>
      )}
    </Space>
  );
}

export default ActionGroup;
