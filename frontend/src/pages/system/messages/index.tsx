import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProTable } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Space,
  Typography,
  message,
  Tabs,
  Badge,
  Modal,
} from "antd";
import {
  InboxOutlined,
  StarOutlined,
  DeleteOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  RestOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { systemApi, type SystemMessageRecord } from "@/api/system";
import { MessageSettings } from "./components/MessageSettings";
import {
  ColumnCustomizer,
  loadColumnConfig,
  type ColumnConfig,
} from "@/components/table/ColumnCustomizer";
import { defaultMessageColumns, getMessageColumns } from "./components/columns";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const { Title, Text, Paragraph } = Typography;

type MessageView = "inbox" | "favorite" | "deleted" | "settings";

/**
 * 工业级通知管理工作站 (对标 PRD 2.3)
 * 特点：玻璃拟态视觉、全生命周期管理、批量回收站治理
 */
export default function SystemMessagesPage() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<MessageView>("inbox");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    loadColumnConfig("system-messages-columns", defaultMessageColumns),
  );

  // 快捷键支持
  useKeyboardShortcuts({
    "ctrl+r": () => refresh(),
    "ctrl+a": () => {
      if (activeView !== "settings") {
        systemApi.markAllMessagesRead().then(refresh);
      }
    },
    escape: () => {
      setSelectedIds([]);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["system-messages-stats"],
    queryFn: () => systemApi.messageStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data = [], isLoading } = useQuery<SystemMessageRecord[]>({
    queryKey: ["system-messages", activeView, keyword],
    queryFn: () => systemApi.listMessages({ view: activeView, keyword }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["system-messages"] });
    queryClient.invalidateQueries({ queryKey: ["system-messages-stats"] });
  };

  // --- 核心操作 Mutation ---

  const markReadMutation = useMutation({
    mutationFn: systemApi.markMessageRead,
    onSuccess: () => {
      message.success("已标记为已读");
      refresh();
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: systemApi.toggleMessageFavorite,
    onSuccess: () => refresh(),
  });

  const trashMutation = useMutation({
    mutationFn: systemApi.moveToTrash,
    onSuccess: () => {
      message.success("已移入回收站");
      setSelectedIds([]);
      refresh();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: systemApi.restoreFromTrash,
    onSuccess: () => {
      message.success("消息已恢复至收件箱");
      setSelectedIds([]);
      refresh();
    },
  });

  // --- 表格列定义 (PRD 2.3.1) ---
  const tableColumns = getMessageColumns(
    columns,
    {
      onMarkRead: (id) => markReadMutation.mutate(id),
      onToggleFavorite: (id) => favoriteMutation.mutate(id),
      onMoveToTrash: (ids) => trashMutation.mutate(ids),
      onRestore: (ids) => restoreMutation.mutate(ids),
    },
    activeView,
  );

  return (
    <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <GlobalLoading loading={globalLoading} />
      {/* 头部状态与快速筛选 */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 backdrop-blur-md bg-white/80">
        <Space direction="vertical" size={0}>
          <Title
            level={3}
            className="!m-0 font-black text-slate-900 tracking-tight"
          >
            通知中心
          </Title>
          <Text className="text-slate-500 font-bold">
            全渠道消息路由与生命周期管理方案
          </Text>
        </Space>

        <Space size={16}>
          <div className="bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-4 border border-slate-200">
            <div className="flex flex-col">
              <Text className="text-[10px] text-slate-400 font-black uppercase">
                未读待办
              </Text>
              <Text className="text-xl font-black text-blue-600 leading-tight">
                {stats?.unreadCount || 0}
              </Text>
            </div>
            <div className="w-[1px] h-8 bg-slate-200" />
            <div className="flex flex-col">
              <Text className="text-[10px] text-slate-400 font-black uppercase">
                星标消息
              </Text>
              <Text className="text-xl font-black text-amber-500 leading-tight">
                {stats?.favoriteCount || 0}
              </Text>
            </div>
          </div>
          <Button
            type="primary"
            className="bg-slate-900 h-[44px] px-6 rounded-xl font-bold border-none"
            icon={<CheckCircleOutlined />}
            onClick={() => systemApi.markAllMessagesRead().then(refresh)}
          >
            全部已读
          </Button>
        </Space>
      </div>

      {/* 主视图区域 */}
      <Card
        className="flex-1 rounded-2xl shadow-sm border-slate-100 overflow-hidden"
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeView}
          onChange={(k) => setActiveView(k as any)}
          className="px-6 pt-4 bg-slate-50/50 border-b border-slate-100"
          items={[
            {
              label: (
                <Space>
                  <InboxOutlined />
                  <span>收件箱</span>
                </Space>
              ),
              key: "inbox",
            },
            {
              label: (
                <Space>
                  <StarOutlined />
                  <span>收藏夹</span>
                </Space>
              ),
              key: "favorite",
            },
            {
              label: (
                <Space>
                  <RestOutlined />
                  <span>回收站</span>
                  <Badge
                    count={stats?.deletedCount}
                    size="small"
                    className="ml-1"
                  />
                </Space>
              ),
              key: "deleted",
            },
            {
              label: (
                <Space>
                  <SettingOutlined />
                  <span>通知设置</span>
                </Space>
              ),
              key: "settings",
            },
          ]}
        />

        {activeView === "settings" ? (
          <MessageSettings />
        ) : (
          <div className="p-4">
            <ProTable<SystemMessageRecord>
              rowKey="id"
              columns={tableColumns}
              dataSource={data}
              loading={isLoading}
              search={false}
              options={{
                density: false,
                fullScreen: false,
                setting: false,
                reload: refresh,
              }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
              }}
              tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
                <Space size={24}>
                  <Text className="font-bold text-slate-600">
                    已选择 {selectedRowKeys.length} 项
                  </Text>
                  {activeView === "deleted" ? (
                    <Button
                      type="link"
                      onClick={() =>
                        restoreMutation.mutate(selectedIds as string[])
                      }
                    >
                      批量恢复
                    </Button>
                  ) : (
                    <Button
                      type="link"
                      danger
                      onClick={() =>
                        trashMutation.mutate(selectedIds as string[])
                      }
                    >
                      批量移入回收站
                    </Button>
                  )}
                  <Button type="link" onClick={onCleanSelected}>
                    取消选择
                  </Button>
                </Space>
              )}
              pagination={{ pageSize: 10 }}
              toolbar={{
                search: {
                  placeholder: "搜索通知标题或内容...",
                  onSearch: (val) => setKeyword(val),
                  style: { width: 300, height: 44 },
                },
                actions: [
                  activeView === "deleted" && data.length > 0 && (
                    <Button
                      key="purge"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: "清空回收站",
                          content:
                            "确定要永久删除回收站里的所有消息吗？此操作不可撤销。",
                          onOk: () =>
                            systemApi.purgeTrash().then(() => {
                              message.success("回收站已清空");
                              setSelectedIds([]);
                              refresh();
                            }),
                        });
                      }}
                    >
                      清空回收站
                    </Button>
                  ),
                  <ColumnCustomizer
                    key="columns"
                    columns={columns}
                    onChange={setColumns}
                    storageKey="system-messages-columns"
                  />,
                  <Button
                    key="refresh"
                    icon={<ReloadOutlined />}
                    onClick={refresh}
                    style={{ height: 44, width: 44 }}
                  />,
                ],
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
