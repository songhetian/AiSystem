import { useState } from "react";
import {
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Drawer,
  Form,
  Row,
  Col,
  Tag,
  Divider,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import "./AdvancedSearch.less";

const { RangePicker } = DatePicker;

export interface SearchField {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "dateRange" | "number";
  options?: { label: string; value: any }[];
  placeholder?: string;
}

export interface SearchValues {
  [key: string]: any;
}

interface AdvancedSearchProps {
  fields: SearchField[];
  onSearch: (values: SearchValues) => void;
  onReset?: () => void;
  storageKey?: string;
  showHistory?: boolean;
}

export function AdvancedSearch({
  fields,
  onSearch,
  onReset,
  storageKey = "advanced_search",
  showHistory = true,
}: AdvancedSearchProps) {
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useLocalStorage<SearchValues[]>(
    `${storageKey}_history`,
    [],
  );

  // 快速搜索（第一个字段）
  const [quickSearchValue, setQuickSearchValue] = useState("");

  const handleQuickSearch = () => {
    if (fields.length === 0) return;
    const firstField = fields[0];
    onSearch({ [firstField.name]: quickSearchValue });
    saveToHistory({ [firstField.name]: quickSearchValue });
  };

  const handleAdvancedSearch = () => {
    const values = form.getFieldsValue();
    onSearch(values);
    saveToHistory(values);
    setDrawerOpen(false);
  };

  const handleReset = () => {
    form.resetFields();
    setQuickSearchValue("");
    onReset?.();
  };

  const saveToHistory = (values: SearchValues) => {
    if (!showHistory) return;

    // 过滤空值
    const filtered = Object.entries(values).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {} as SearchValues);

    if (Object.keys(filtered).length === 0) return;

    // 添加到历史记录（最多保留10条）
    const newHistory = [
      filtered,
      ...searchHistory.filter(
        (h) => JSON.stringify(h) !== JSON.stringify(filtered),
      ),
    ].slice(0, 10);
    setSearchHistory(newHistory);
  };

  const applyHistorySearch = (values: SearchValues) => {
    form.setFieldsValue(values);
    onSearch(values);
    setDrawerOpen(false);
  };

  const renderField = (field: SearchField) => {
    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={field.placeholder || `请输入${field.label}`}
            allowClear
          />
        );
      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || `请输入${field.label}`}
            allowClear
          />
        );
      case "select":
        return (
          <Select
            placeholder={field.placeholder || `请选择${field.label}`}
            options={field.options}
            allowClear
          />
        );
      case "date":
        return (
          <DatePicker
            style={{ width: "100%" }}
            placeholder={`请选择${field.label}`}
          />
        );
      case "dateRange":
        return <RangePicker style={{ width: "100%" }} />;
      default:
        return null;
    }
  };

  return (
    <div className="advanced-search">
      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder={fields[0]?.placeholder || "快速搜索"}
          prefix={<SearchOutlined />}
          value={quickSearchValue}
          onChange={(e) => setQuickSearchValue(e.target.value)}
          onPressEnter={handleQuickSearch}
          allowClear
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleQuickSearch}
        >
          搜索
        </Button>
        <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
          高级
        </Button>
      </Space.Compact>

      <Drawer
        title="高级搜索"
        placement="right"
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button icon={<ClearOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleAdvancedSearch}
            >
              搜索
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            {fields.map((field) => (
              <Col span={24} key={field.name}>
                <Form.Item label={field.label} name={field.name}>
                  {renderField(field)}
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>

        {showHistory && searchHistory.length > 0 && (
          <>
            <Divider />
            <div className="search-history">
              <div className="history-title">
                <HistoryOutlined /> 搜索历史
              </div>
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="small"
              >
                {searchHistory.map((history, index) => (
                  <div
                    key={index}
                    className="history-item"
                    onClick={() => applyHistorySearch(history)}
                  >
                    <Space wrap size={4}>
                      {Object.entries(history).map(([key, value]) => {
                        const field = fields.find((f) => f.name === key);
                        return (
                          <Tag key={key} color="blue">
                            {field?.label}: {String(value)}
                          </Tag>
                        );
                      })}
                    </Space>
                  </div>
                ))}
              </Space>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => setSearchHistory([])}
                style={{ marginTop: 8 }}
              >
                清除历史
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
