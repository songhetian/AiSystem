import { AutoComplete, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

export const SmartSearch = ({
  onSearch,
  storageKey,
  placeholder = "搜索...",
}: {
  onSearch: (value: string) => void;
  storageKey: string;
  placeholder?: string;
}) => {
  const [options, setOptions] = useState<{ value: string }[]>([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
    setOptions(history.map((h: string) => ({ value: h })));
  }, [storageKey]);

  const handleSearch = (value: string) => {
    if (value) {
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const newHistory = [
        value,
        ...history.filter((h: string) => h !== value),
      ].slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      setOptions(newHistory.map((h) => ({ value: h })));
    }
    onSearch(value);
  };

  return (
    <AutoComplete
      options={options}
      onSelect={handleSearch}
      style={{ width: 300 }}
    >
      <Input.Search
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        onSearch={handleSearch}
        allowClear
      />
    </AutoComplete>
  );
};
