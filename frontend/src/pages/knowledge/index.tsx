import React, { useState } from "react";
import { Layout, Menu, Typography, ConfigProvider } from "antd";
import {
  DatabaseOutlined,
  FolderOpenOutlined,
  BlockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { KnowledgeBaseList } from "./components/KnowledgeBaseList";
import { FileManagement } from "./components/FileManagement";
import { VectorManagement } from "./components/VectorManagement";
import { InterfaceMonitorManagement } from "./components/InterfaceMonitorManagement";

const { Sider, Content } = Layout;
const { Title } = Typography;

export default function KnowledgeConsole() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("kb");

  const renderContent = () => {
    switch (activeKey) {
      case "kb":
        return <KnowledgeBaseList />;
      case "file":
        return <FileManagement />;
      case "vector":
        return <VectorManagement />;
      case "monitor":
        return <InterfaceMonitorManagement />;
      default:
        return <KnowledgeBaseList />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "rgba(255, 255, 255, 0.1)",
            itemSelectedColor: "#fff",
            itemColor: "rgba(255, 255, 255, 0.6)",
            itemHoverBg: "rgba(255, 255, 255, 0.05)",
            itemHoverColor: "#fff",
            iconSize: 18,
          },
        },
      }}
    >
      <Layout
        className="min-h-[calc(100vh-64px)] bg-slate-50 overflow-hidden border border-slate-200"
        style={{ borderRadius: 16 }}
      >
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          className="bg-slate-900 shadow-2xl relative z-10"
          style={{ paddingTop: 20 }}
        >
          <div className="flex items-center space-x-3 px-6 mb-8 mt-2 overflow-hidden h-8">
            <div
              className={`w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 transition-all ${collapsed ? "mx-auto" : ""}`}
            >
              <DatabaseOutlined className="text-white text-lg" />
            </div>
            {!collapsed && (
              <span className="text-lg font-black tracking-widest text-white whitespace-nowrap">
                豆包知识库
              </span>
            )}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            onClick={(e) => setActiveKey(e.key)}
            className="border-none font-bold tracking-wider"
            items={[
              {
                key: "kb",
                icon: <DatabaseOutlined />,
                label: "知识库列表",
              },
              {
                key: "file",
                icon: <FolderOpenOutlined />,
                label: "文件管理",
              },
              {
                key: "vector",
                icon: <BlockOutlined />,
                label: "底层向维管理",
              },
              {
                key: "monitor",
                icon: <ApiOutlined />,
                label: "接口监控",
              },
            ]}
          />

          <div
            className="absolute bottom-4 left-0 w-full flex justify-center cursor-pointer opacity-50 hover:opacity-100 transition-all text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <MenuUnfoldOutlined className="text-xl" />
            ) : (
              <MenuFoldOutlined className="text-xl" />
            )}
          </div>
        </Sider>
        <Content className="p-8 h-[calc(100vh-64px)] overflow-y-auto bg-slate-50 relative">
          <div className="max-w-[1400px] mx-auto transition-all duration-500">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
