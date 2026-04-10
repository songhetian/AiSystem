import { Tag } from 'antd';

const colorMap: Record<string, string> = {
  启用: 'green',
  禁用: 'default',
  异常: 'red'
};

export function StatusTag({ value }: { value: string }) {
  return <Tag color={colorMap[value] ?? 'blue'}>{value}</Tag>;
}

export default StatusTag;
