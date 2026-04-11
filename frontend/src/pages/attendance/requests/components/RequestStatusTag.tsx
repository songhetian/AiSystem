import { Tag } from 'antd';

export const RequestStatusTag = ({ status }: { status: number }) => {
  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '待审批', color: 'orange' },
    1: { text: '已通过', color: 'green' },
    2: { text: '已拒绝', color: 'red' },
  };

  const { text, color } = statusMap[status] || { text: '未知', color: 'default' };

  return <Tag color={color} className="font-bold">{text}</Tag>;
};
