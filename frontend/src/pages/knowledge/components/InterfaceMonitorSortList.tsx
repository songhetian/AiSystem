import { useState, useEffect } from "react";
import { Button, Card, Space, Tag, message, Empty, Tooltip } from "antd";
import {
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { BaseDrag } from "@/components/common/BaseDrag";
import "./InterfaceMonitorSortList.less";

export interface InterfaceMonitor {
  id: string;
  interface_id: string;
  interface_name: string;
  interface_path: string;
  monitor_fields: {
    response_time: boolean;
    success_rate: boolean;
    error_count: boolean;
    data_volume: boolean;
  };
  priority: number;
  sort: number;
  status: number;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
}

interface InterfaceMonitorSortListProps {
  monitors: InterfaceMonitor[];
  onSave: (monitors: InterfaceMonitor[]) => void;
  loading?: boolean;
}

export function InterfaceMonitorSortList({
  monitors,
  onSave,
  loading,
}: InterfaceMonitorSortListProps) {
  const [sortedMonitors, setSortedMonitors] = useState<InterfaceMonitor[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (monitors.length > 0) {
      const sorted = [...monitors].sort(
        (a, b) => (a.sort || 0) - (b.sort || 0),
      );
      setSortedMonitors(sorted);
      setHasChanges(false);
    } else {
      setSortedMonitors([]);
    }
  }, [monitors]);

  const handleDragEnd = (newItems: InterfaceMonitor[]) => {
    setSortedMonitors(newItems);
    setHasChanges(true);
  };

  const handleSave = () => {
    const items = sortedMonitors.map((monitor, index) => ({
      ...monitor,
      sort: index,
      priority: index < 3 ? 1 : index < 6 ? 2 : 3,
    }));
    onSave(items);
    setHasChanges(false);
  };

  const handleReset = () => {
    const sorted = [...monitors].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    setSortedMonitors(sorted);
    setHasChanges(false);
  };

  const getMonitorFieldsDisplay = (
    fields: InterfaceMonitor["monitor_fields"],
  ) => {
    const activeFields = [];
    if (fields.response_time) activeFields.push("响应时间");
    if (fields.success_rate) activeFields.push("成功率");
    if (fields.error_count) activeFields.push("错误次数");
    if (fields.data_volume) activeFields.push("数据量");
    return activeFields;
  };

  if (sortedMonitors.length === 0) {
    return (
      <Empty
        description="暂无接口监控配置"
        style={{ padding: "60px 0" }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          <span>接口监控排序</span>
          {hasChanges && <Tag color="warning">未保存</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button onClick={handleReset} disabled={!hasChanges}>
            重置
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存排序
          </Button>
        </Space>
      }
    >
      <div className="interface-monitor-sort-container">
        <div className="sort-tip">
          <ApiOutlined />{" "}
          拖拽调整接口监控的优先级，排序越靠前优先级越高（优先展示和告警）
        </div>

        <BaseDrag
          items={sortedMonitors}
          getItemId={(monitor) => monitor.id}
          onDragEnd={handleDragEnd}
          renderItem={(monitor, index) => {
            const calculatedPriority = index < 3 ? 1 : index < 6 ? 2 : 3;
            const monitorFields = getMonitorFieldsDisplay(
              monitor.monitor_fields,
            );

            return (
              <div className="interface-monitor-sort-item">
                <span className="drag-handle">⋮⋮</span>
                <span className="sort-number">{index + 1}</span>

                <div className="monitor-info">
                  <div className="monitor-header">
                    <Space size={8} wrap>
                      <Tooltip title={monitor.interface_path}>
                        <span className="monitor-name">
                          <ApiOutlined /> {monitor.interface_name}
                        </span>
                      </Tooltip>

                      <Tag
                        color={
                          calculatedPriority === 1
                            ? "red"
                            : calculatedPriority === 2
                              ? "orange"
                              : "default"
                        }
                        icon={
                          calculatedPriority === 1 ? (
                            <ClockCircleOutlined />
                          ) : calculatedPriority === 2 ? (
                            <CheckCircleOutlined />
                          ) : null
                        }
                      >
                        {calculatedPriority === 1
                          ? "高"
                          : calculatedPriority === 2
                            ? "中"
                            : "低"}
                        优先级
                      </Tag>

                      {monitor.status === 0 && (
                        <Tag color="default">已禁用</Tag>
                      )}
                    </Space>
                  </div>

                  <div className="monitor-fields">
                    <Space size={4} wrap>
                      <span className="fields-label">监控字段：</span>
                      {monitorFields.map((field) => (
                        <Tag key={field} color="blue" className="field-tag">
                          {field}
                        </Tag>
                      ))}
                    </Space>
                  </div>

                  <div className="monitor-path">
                    <span className="path-label">接口路径：</span>
                    <code className="path-code">{monitor.interface_path}</code>
                  </div>
                </div>
              </div>
            );
          }}
          direction="vertical"
        />
      </div>
    </Card>
  );
}
