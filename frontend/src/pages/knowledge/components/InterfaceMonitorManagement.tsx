import { useState } from "react";
import { Card, Tabs, Button, Space, message } from "antd";
import {
  ApiOutlined,
  SettingOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  InterfaceMonitorSortList,
  InterfaceMonitor,
} from "./InterfaceMonitorSortList";

const { TabPane } = Tabs;

export function InterfaceMonitorManagement() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("sort");

  // 模拟数据 - 实际应该从API获取
  const [monitors] = useState<InterfaceMonitor[]>([
    {
      id: "1",
      interface_id: "api_001",
      interface_name: "知识库文章查询",
      interface_path: "/api/knowledge/articles",
      monitor_fields: {
        response_time: true,
        success_rate: true,
        error_count: true,
        data_volume: false,
      },
      priority: 1,
      sort: 0,
      status: 1,
    },
    {
      id: "2",
      interface_id: "api_002",
      interface_name: "向量检索接口",
      interface_path: "/api/knowledge/vector-search",
      monitor_fields: {
        response_time: true,
        success_rate: true,
        error_count: false,
        data_volume: true,
      },
      priority: 1,
      sort: 1,
      status: 1,
    },
    {
      id: "3",
      interface_id: "api_003",
      interface_name: "文档上传接口",
      interface_path: "/api/knowledge/documents/upload",
      monitor_fields: {
        response_time: true,
        success_rate: true,
        error_count: true,
        data_volume: true,
      },
      priority: 2,
      sort: 2,
      status: 1,
    },
    {
      id: "4",
      interface_id: "api_004",
      interface_name: "分类管理接口",
      interface_path: "/api/knowledge/categories",
      monitor_fields: {
        response_time: false,
        success_rate: true,
        error_count: true,
        data_volume: false,
      },
      priority: 3,
      sort: 3,
      status: 1,
    },
  ]);

  const handleSaveSort = async (sortedMonitors: InterfaceMonitor[]) => {
    setLoading(true);
    try {
      // TODO: 调用API保存排序
      // await knowledgeApi.updateInterfaceMonitorSort(sortedMonitors);

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success("接口监控排序已保存");
    } catch (error) {
      message.error("保存失败，请重试");
      console.error("Save sort error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="interface-monitor-management">
      <Card
        title={
          <Space>
            <ApiOutlined style={{ fontSize: 20, color: "#667eea" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>接口监控管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<SettingOutlined />}>
            监控配置
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "sort",
              label: (
                <span>
                  <ApiOutlined />
                  接口排序
                </span>
              ),
              children: (
                <InterfaceMonitorSortList
                  monitors={monitors}
                  onSave={handleSaveSort}
                  loading={loading}
                />
              ),
            },
            {
              key: "data",
              label: (
                <span>
                  <BarChartOutlined />
                  监控数据
                </span>
              ),
              children: (
                <Card>
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#8c8c8c",
                    }}
                  >
                    <BarChartOutlined
                      style={{ fontSize: 48, marginBottom: 16 }}
                    />
                    <div>监控数据展示功能开发中...</div>
                  </div>
                </Card>
              ),
            },
            {
              key: "schedule",
              label: (
                <span>
                  <ClockCircleOutlined />
                  定时任务
                </span>
              ),
              children: (
                <Card>
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#8c8c8c",
                    }}
                  >
                    <ClockCircleOutlined
                      style={{ fontSize: 48, marginBottom: 16 }}
                    />
                    <div>定时任务配置功能开发中...</div>
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
