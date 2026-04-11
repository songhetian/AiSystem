import { Tag } from "antd";

const colorMap: Record<string, string> = {
  启用: "green",
  禁用: "default",
  异常: "red",
};

interface StatusTagProps {
  value?: string;
  color?: string;
  text?: string;
  status?: string;
}

export function StatusTag({ value, color, text, status }: StatusTagProps) {
  // 支持两种使用方式：
  // 1. <StatusTag value="启用" /> - 使用预定义的颜色映射
  // 2. <StatusTag color="blue" text="文本" /> - 自定义颜色和文本
  const displayText = text || value || "";
  const displayColor =
    color || (status ? status : (colorMap[displayText] ?? "blue"));

  return <Tag color={displayColor}>{displayText}</Tag>;
}

export default StatusTag;
