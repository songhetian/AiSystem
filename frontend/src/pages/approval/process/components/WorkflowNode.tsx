import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Card, Space, Typography } from 'antd';
import { BranchesOutlined, DeleteOutlined, MenuOutlined, SendOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import type { ApprovalNode } from '@/api/approval';

const { Text } = Typography;

interface WorkflowNodeProps {
  node: ApprovalNode;
  index: number;
  onEdit: (node: ApprovalNode) => void;
  onDelete: (id: string) => void;
  isLocked?: boolean;
}

export function WorkflowNode({ node, index, onEdit, onDelete, isLocked }: WorkflowNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderIcon = () => {
    switch (node.type) {
      case 'start':
        return <Badge status="processing" text={<Text className="font-black">开始</Text>} />;
      case 'approval':
        return <UserOutlined className="text-blue-600" />;
      case 'branch':
        return <BranchesOutlined className="text-orange-600" />;
      case 'copy':
        return <SendOutlined className="text-green-600" />;
      case 'end':
        return <Badge status="default" text={<Text className="font-black text-slate-400">结束</Text>} />;
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col items-center">
      {index > 0 ? <div className="h-8 w-[2px] bg-slate-300" /> : null}

      <Card
        size="small"
        className={`w-64 border-2 shadow-sm ${isDragging ? 'border-blue-500' : 'border-slate-200'} ${isLocked ? 'bg-slate-50' : 'bg-white'}`}
        styles={{ body: { padding: '12px' } }}
      >
        <div className="mb-2 flex items-center justify-between">
          <Space size={8}>
            {!isLocked ? (
              <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <MenuOutlined />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              {renderIcon()}
              <Text className="font-bold text-slate-900">{node.name}</Text>
            </div>
          </Space>

          {!isLocked ? <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onDelete(node.id)} /> : null}
        </div>

        {node.type === 'approval' ? (
          <div className="mb-2 rounded border border-blue-100 bg-blue-50 p-2">
            <div className="flex justify-between items-center mb-1">
              <Text className="text-xs text-blue-700">审批人数: {node.approvers?.length || 0}</Text>
              <Badge 
                count={node.mode === 'and' ? '会签' : '或签'} 
                style={{ backgroundColor: node.mode === 'and' ? '#f5222d' : '#1890ff', fontSize: '10px' }} 
              />
            </div>
            <Text className="text-xs text-slate-500">超时: {node.timeoutHours} 小时</Text>
          </div>
        ) : null}

        {node.type === 'branch' ? (
          <div className="mb-2 rounded border border-orange-100 bg-orange-50 p-2">
            <Text className="block text-xs text-orange-700" ellipsis={{ tooltip: node.condition }}>
              条件: {node.condition || '无条件'}
            </Text>
          </div>
        ) : null}

        {node.type === 'copy' ? (
          <div className="mb-2 rounded border border-green-100 bg-green-50 p-2">
            <Text className="block text-xs text-green-700">抄送人数: {node.copies?.length || 0}</Text>
          </div>
        ) : null}

        {!isLocked ? (
          <Button block size="small" icon={<SettingOutlined />} className="border-slate-300 text-xs font-bold" onClick={() => onEdit(node)}>
            配置节点
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
