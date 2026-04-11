import { Card, Statistic, Typography } from 'antd';

const { Text } = Typography;

interface StatisticCardProps {
  title: string;
  value: number;
  prefix?: string;
  borderColor: string;
}

export const StatisticCard = ({ title, value, prefix = '￥', borderColor }: StatisticCardProps) => (
  <Card bordered={false} className={`shadow-sm border-l-4 ${borderColor}`}>
    <Statistic
      title={<Text className="font-bold text-slate-600">{title}</Text>}
      value={value}
      precision={2}
      prefix={prefix}
      valueStyle={{ color: '#0f172a', fontWeight: 900, fontSize: 28 }}
    />
  </Card>
);
