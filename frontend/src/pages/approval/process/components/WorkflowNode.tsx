import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Tag, Space, Button, Badge } from 'antd';
import { MenuOutlined, DeleteOutlined, SettingOutlined, UserOutlined, BranchesOutlined, SendOutlined } from '@ant-design/icons';
import { ApprovalNode } from '@/api/approval';

const { Text } = Typography;

interface WorkflowNodeProps {
  node: ApprovalNode;
  index: number;
  onEdit: (node: ApprovalNode) => void;
  onDelete: (id: string) => void;
  isLocked?: boolean; // start 和 end 节点不可删除和排序
}

export function WorkflowNode({ node, index, onEdit, onDelete, isLocked }: WorkflowNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: node.id,
    disabled: isLocked 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (node.type) {
      case 'start': return <Badge status="processing" text={<Text className="font-black">开始</Text>} />;
      case 'approval': return <UserOutlined className="text-blue-600" />;
      case 'branch': return <BranchesOutlined className="text-orange-600" />;
      case 'copy': return <SendOutlined className="text-green-600" />;
      case 'end': return <Badge status="default" text={<Text className="font-black text-slate-400">结束</Text>} />;
      default: return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col items-center">
      {/* 节点上方连线 */}
      {index > 0 && <div className="w-[2px] h-8 bg-slate-300" />}

      <Card
        size="small"
        className={`w-64 shadow-sm border-2 ${isDragging ? 'border-blue-500' : 'border-slate-200'} ${isLocked ? 'bg-slate-50' : 'bg-white'}`}
        styles={{ body: { padding: '12px' } }}
      >
        <div className="flex items-center justify-between mb-2">
          <Space size={8}>
            {!isLocked && (
              <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <MenuOutlined />
              </div>
            )}
            <div className="flex items-center gap-2">
              {getIcon()}
              <Text className="font-bold text-slate-900">{node.name}</Text>
            </div>
          </Space>
          
          {!isLocked && (
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<DeleteOutlined />} 
              onClick={() => onDelete(node.id)} 
            />
          )}
        </div>

        {node.type === 'approval' && (
          <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2">
            <Text className="text-xs text-blue-700 block">审批人: {node.approvers?.length || 0}人</Text>
            <Text className="text-xs text-slate-500">超时: {node.timeoutHours}小时</Text>
          </div>
        )}

        {node.type === 'branch' && (
          <div className="bg-orange-50 p-2 rounded border border-orange-100 mb-2">
            <Text className="text-xs text-orange-700 block" ellipsis={{ tooltip: node.condition }}>
              条件: {node.condition || '无条件'}
            </Text>
          </div>
        )}

        {!isLocked && (
          <Button 
            block 
            size="small" 
            icon={<SettingOutlined />} 
            className="text-xs font-bold border-slate-300"
            onClick={() => onEdit(node)}
          >
            设置节点
          </Button>
        )}
      </Card>
    </div>
  );
}
