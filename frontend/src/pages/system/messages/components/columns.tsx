import { Space, Tag, Typography, Button, Tooltip, Badge } from "antd";
import { StarOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ProColumns } from "@ant-design/pro-components";
import type { SystemMessageRecord } from "@/api/system";
import type { ColumnConfig } from "@/components/table/ColumnCustomizer";

const { Text, Paragraph } = Typography;

/**
 * 消息列表默认列配置
 */
export const defaultMessageColumns: ColumnConfig[] = [
  { key: "title", title: "消息详情", visible: true, fixed: true },
  { key: "message_type", title: "消息类型", visible: true },
  { key: "sender_name", title: "发送人", visible: true },
  { key: "create_time", title: "时间", visible: true },
  { key: "route", title: "关联路由", visible: false },
  { key: "platform", title: "关联平台", visible: false },
  { key: "department", title: "关联部门", visible: false },
  { key: "shop", title: "关联店铺", visible: false },
  { key: "actions", title: "操作", visible: true, fixed: true },
];

/**
 * 获取消息列表的列定义
 */
export const getMessageColumns = (
  columnConfig: ColumnConfig[] | null,
  handlers: {
    onMarkRead: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onMoveToTrash: (ids: string[]) => void;
    onRestore: (ids: string[]) => void;
  },
  activeView: string,
): ProColumns<SystemMessageRecord>[] => {
  const allColumns: ProColumns<SystemMessageRecord>[] = [
    {
      key: "title",
      title: "消息详情",
      dataIndex: "title",
      render: (_, record) => (
        <Space direction="vertical" size={4} className="py-2">
          <Space wrap>
            <Tag
              color={record.read_status === 0 ? "processing" : "default"}
              className="font-bold border-none rounded-sm"
            >
              {record.read_status === 0 ? "未读" : "已读"}
            </Tag>
            <Badge
              status={
                record.message_type === "interface" ? "error" : "processing"
              }
              text={record.message_type?.toUpperCase()}
              className="text-slate-400 font-bold text-[10px]"
            />
          </Space>
          <Text
            className={`text-base ${record.read_status === 0 ? "font-black text-slate-900" : "text-slate-500 font-medium"}`}
          >
            {record.title}
          </Text>
          <Paragraph
            ellipsis={{ rows: 1 }}
            className="text-slate-500 m-0 text-sm"
          >
            {record.content}
          </Paragraph>
        </Space>
      ),
    },
    {
      key: "message_type",
      title: "消息类型",
      dataIndex: "message_type",
      width: 120,
      render: (val) => (
        <Tag color="blue" className="font-bold">
          {val?.toUpperCase() || "-"}
        </Tag>
      ),
    },
    {
      key: "sender_name",
      title: "发送人",
      dataIndex: "sender_name",
      width: 120,
      render: (val) => (
        <Text className="font-bold text-slate-600">{val || "系统"}</Text>
      ),
    },
    {
      key: "create_time",
      title: "时间",
      dataIndex: "create_time",
      valueType: "dateTime",
      width: 180,
      className: "text-slate-400 font-medium",
    },
    {
      key: "route",
      title: "关联路由",
      dataIndex: "route",
      width: 150,
      render: (val) => (
        <Text className="text-slate-500 text-xs font-mono">{val || "-"}</Text>
      ),
    },
    {
      key: "platform",
      title: "关联平台",
      dataIndex: "platform_name",
      width: 120,
      render: (val) => <Text className="text-slate-600">{val || "-"}</Text>,
    },
    {
      key: "department",
      title: "关联部门",
      dataIndex: "dept_name",
      width: 120,
      render: (val) => <Text className="text-slate-600">{val || "-"}</Text>,
    },
    {
      key: "shop",
      title: "关联店铺",
      dataIndex: "shop_name",
      width: 120,
      render: (val) => <Text className="text-slate-600">{val || "-"}</Text>,
    },
    {
      key: "actions",
      title: "操作",
      valueType: "option",
      width: 150,
      render: (_, record) => [
        <Tooltip title={record.is_favorite ? "取消收藏" : "收藏"} key="fav">
          <Button
            type="text"
            icon={
              <StarOutlined
                className={
                  record.is_favorite ? "text-amber-500" : "text-slate-300"
                }
              />
            }
            onClick={() => handlers.onToggleFavorite(record.id)}
          />
        </Tooltip>,
        record.read_status === 0 && (
          <Button
            type="link"
            size="small"
            key="read"
            onClick={() => handlers.onMarkRead(record.id)}
          >
            标记已读
          </Button>
        ),
        activeView === "deleted" ? (
          <Button
            type="link"
            size="small"
            key="restore"
            onClick={() => handlers.onRestore([record.id])}
          >
            恢复
          </Button>
        ) : (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            key="del"
            onClick={() => handlers.onMoveToTrash([record.id])}
          />
        ),
      ],
    },
  ];

  // 如果有列配置，则根据配置过滤和排序
  if (columnConfig) {
    const visibleKeys = new Set(
      columnConfig.filter((c) => c.visible).map((c) => c.key),
    );
    return columnConfig
      .filter((c) => c.visible)
      .map((c) => allColumns.find((col) => col.key === c.key))
      .filter(Boolean) as ProColumns<SystemMessageRecord>[];
  }

  return allColumns;
};
