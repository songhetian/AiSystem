import { AutoComplete, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

interface SmartSearchProps {
  onSearch: (value: string) => void;
  storageKey: string;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

/**
 * 智能搜索组件 - 支持搜索历史记录
 * @param onSearch 搜索回调函数
 * @param storageKey 本地存储的键名
 * @param placeholder 占位符文本
 * @param style 样式
 * @param allowClear 是否显示清除按钮
 */
export const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  storageKey,
  placeholder = "搜索...",
  style = { width: 300 },
  allowClear = true,
}) => {
  const [options, setOptions] = useState<{ value: string }[]>([]);

  useEffect(() => {
    // 加载搜索历史
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setOptions(history.map((h: string) => ({ value: h })));
    } catch (e) {
      console.error("[SmartSearch] 加载搜索历史失败", e);
    }
  }, [storageKey]);

  const handleSearch = (value: string) => {
    if (value && value.trim()) {
      try {
        const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
        // 将新搜索词添加到历史记录开头，去重，保留最近 10 条
        const newHistory = [
          value.trim(),
          ...history.filter((h: string) => h !== value.trim()),
        ].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(newHistory));
        setOptions(newHistory.map((h) => ({ value: h })));
      } catch (e) {
        console.error("[SmartSearch] 保存搜索历史失败", e);
      }
    }
    onSearch(value);
  };

  return (
    <AutoComplete options={options} onSelect={handleSearch} style={style}>
      <Input.Search
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        onSearch={handleSearch}
        allowClear={allowClear}
      />
    </AutoComplete>
  );
};
