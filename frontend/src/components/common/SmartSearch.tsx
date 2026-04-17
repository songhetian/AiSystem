import { AutoComplete, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

interface SmartSearchProps {
  onSearch: (value: string) => void;
  storageKey: string;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  allowClear?: boolean;
}

/**
 * 智能搜索组件 - 支持搜索历史记录
 *
 * @param onSearch - 搜索回调函数
 * @param storageKey - 本地存储键名（用于保存搜索历史）
 * @param placeholder - 输入框占位符
 * @param style - 自定义样式
 * @param className - 自定义类名
 * @param allowClear - 是否显示清除按钮
 */
export const SmartSearch: React.FC<SmartSearchProps> = ({
  onSearch,
  storageKey,
  placeholder = "搜索...",
  style,
  className,
  allowClear = true,
}) => {
  const [options, setOptions] = useState<{ value: string }[]>([]);
  const [searchValue, setSearchValue] = useState("");

  // 加载搜索历史
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setOptions(history.map((h: string) => ({ value: h })));
    } catch (e) {
      console.error("[SmartSearch] 加载搜索历史失败", e);
    }
  }, [storageKey]);

  // 保存搜索历史
  const saveSearchHistory = (value: string) => {
    if (!value.trim()) return;

    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      // 去重并限制历史记录数量为10条
      const newHistory = [
        value,
        ...history.filter((h: string) => h !== value),
      ].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      setOptions(newHistory.map((h) => ({ value: h })));
    } catch (e) {
      console.error("[SmartSearch] 保存搜索历史失败", e);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    saveSearchHistory(value);
    onSearch(value);
  };

  // 处理选择历史记录
  const handleSelect = (value: string) => {
    setSearchValue(value);
    handleSearch(value);
  };

  return (
    <AutoComplete
      value={searchValue}
      options={options}
      onSelect={handleSelect}
      onChange={setSearchValue}
      style={style}
      className={className}
    >
      <Input.Search
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        onSearch={handleSearch}
        allowClear={allowClear}
      />
    </AutoComplete>
  );
};
