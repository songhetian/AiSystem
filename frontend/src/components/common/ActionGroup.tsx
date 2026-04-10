import { Button, Space, Popconfirm } from 'antd';
import { Permission } from '@/components/permission/Permission';

interface ActionGroupProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  editPermission?: string;
  deletePermission?: string;
  viewPermission?: string;
  dangerText?: string;
}

export function ActionGroup({
  onEdit,
  onDelete,
  onView,
  editPermission,
  deletePermission,
  viewPermission,
  dangerText = '确认删除？',
}: ActionGroupProps) {
  return (
    <Space size={0}>
      {onView && (
        <Permission code={viewPermission}>
          <Button type="link" size="small" onClick={onView} className="font-bold text-slate-900">
            查看
          </Button>
        </Permission>
      )}
      {onEdit && (
        <Permission code={editPermission}>
          <Button type="link" size="small" onClick={onEdit} className="font-bold text-slate-600">
            编辑
          </Button>
        </Permission>
      )}
      {onDelete && (
        <Permission code={deletePermission}>
          <Popconfirm title={dangerText} onConfirm={onDelete} okText="确定" cancelText="取消">
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
