import { BellOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Drawer,
  Empty,
  Input,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approvalApi } from "@/api/approval";
import {
  systemApi,
  type MessageStats,
  type SystemMessageRecord,
} from "@/api/system";
import {
  buildMessageMetaTags,
  buildMessageSearchText,
  resolveMessageAppearance,
  type MessageCategory,
  type NoticeVariant,
} from "@/utils/message-center";
import styles from "./HeaderMessageHub.module.css";

type HubView = "all" | MessageCategory;

interface ChannelSummary {
  key: string;
  variant: NoticeVariant;
  category: MessageCategory;
  label: string;
  title: string;
  priority: number;
  items: SystemMessageRecord[];
}

export function HeaderMessageHub({ enabled = true }: { enabled?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HubView>("all");
  const [keyword, setKeyword] = useState("");
  const [actionableOnly, setActionableOnly] = useState(false);

  const { data: stats } = useQuery<MessageStats>({
    queryKey: ["system-message-stats"],
    queryFn: systemApi.messageStats,
    enabled,
  });

  const { data: unreadMessages = [] } = useQuery<SystemMessageRecord[]>({
    queryKey: ["system-messages", "header-unread"],
    queryFn: () => systemApi.listMessages({ read_status: 0 }),
    enabled,
  });

  const refreshQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["system-messages"] });
    await queryClient.invalidateQueries({ queryKey: ["system-message-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
    await queryClient.invalidateQueries({
      queryKey: ["approval-request-stats"],
    });
  };

  const approveMutation = useMutation({
    mutationFn: async (message: SystemMessageRecord) => {
      const requestId = message.payload?.requestId;
      if (!requestId) {
        return;
      }

      await approvalApi.approveRequest(requestId, {
        comment: "消息中心快捷同意",
      });
      await systemApi.markMessageRead(message.id);
    },
    onSuccess: refreshQueries,
  });

  const rejectMutation = useMutation({
    mutationFn: async (message: SystemMessageRecord) => {
      const requestId = message.payload?.requestId;
      if (!requestId) {
        return;
      }

      await approvalApi.rejectRequest(requestId, {
        comment: "消息中心快捷驳回",
      });
      await systemApi.markMessageRead(message.id);
    },
    onSuccess: refreshQueries,
  });

  const channels = useMemo(() => {
    const grouped = new Map<string, ChannelSummary>();

    for (const item of unreadMessages) {
      const appearance = resolveMessageAppearance(item.message_type);
      const current = grouped.get(appearance.channelKey);

      if (current) {
        current.items.push(item);
        continue;
      }

      grouped.set(appearance.channelKey, {
        key: appearance.channelKey,
        variant: appearance.variant,
        category: appearance.category,
        label: appearance.label,
        title: appearance.title,
        priority: appearance.priority,
        items: [item],
      });
    }

    return Array.from(grouped.values())
      .map((channel) => ({
        ...channel,
        items: channel.items.sort((left, right) =>
          new Date(right.create_time).getTime() - new Date(left.create_time).getTime()
        ),
      }))
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return new Date(right.items[0]!.create_time).getTime() - 
               new Date(left.items[0]!.create_time).getTime();
      });
  }, [unreadMessages]);

  const visibleChannels = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return channels
      .map((channel) => ({
        ...channel,
        items: channel.items.filter((item) => {
          const matchesView = view === "all" || channel.category === view;
          const matchesKeyword =
            !normalizedKeyword ||
            buildMessageSearchText(item).includes(normalizedKeyword);
          const matchesActionable =
            !actionableOnly ||
            (item.message_type === "approval_pending" &&
              Boolean(item.payload?.requestId));

          return matchesView && matchesKeyword && matchesActionable;
        }),
      }))
      .filter((channel) => channel.items.length > 0);
  }, [actionableOnly, channels, keyword, view]);

  const summary = useMemo(
    () => ({
      approval: channels
        .filter((channel) => channel.category === "approval")
        .reduce((sum, channel) => sum + channel.items.length, 0),
      schedule: channels
        .filter((channel) => channel.category === "schedule")
        .reduce((sum, channel) => sum + channel.items.length, 0),
      system: channels
        .filter((channel) => channel.category === "system")
        .reduce((sum, channel) => sum + channel.items.length, 0),
    }),
    [channels],
  );

  const markAllRead = async () => {
    await systemApi.markAllMessagesRead();
    await refreshQueries();
    setOpen(false);
  };

  const markOneRead = async (item: SystemMessageRecord) => {
    await systemApi.markMessageRead(item.id);
    await refreshQueries();

    if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <>
      <Badge count={stats?.unreadCount ?? 0} size="small" offset={[-4, 4]}>
        <div
          className={`header-action-item ${styles.trigger}`}
          aria-label="消息中心"
          onClick={() => setOpen(true)}
          style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', borderRadius: 6 }}
        >
          <BellOutlined style={{ fontSize: 20 }} />
        </div>
      </Badge>

      <Drawer
        title={null}
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { padding: 16 } }}
      >
        <div className={styles.drawerTop}>
          <div className={styles.title}>
            <span className={styles.eyebrow}>Message Hub</span>
            <span className={styles.heading}>消息中心</span>
            <span className={styles.meta}>
              未读 {stats?.unreadCount ?? 0} 条
            </span>
          </div>
          <Space>
            <Button onClick={() => navigate("/system/messages")}>
              站内消息页
            </Button>
            <Button
              type="primary"
              onClick={() => void markAllRead()}
              disabled={!stats?.unreadCount}
            >
              全部已读
            </Button>
          </Space>
        </div>

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.approval}`}>
            <div className={styles.summaryLabel}>审批</div>
            <div className={styles.summaryValue}>{summary.approval}</div>
          </div>
          <div className={`${styles.summaryCard} ${styles.schedule}`}>
            <div className={styles.summaryLabel}>调班 / 联动</div>
            <div className={styles.summaryValue}>{summary.schedule}</div>
          </div>
          <div className={`${styles.summaryCard} ${styles.system}`}>
            <div className={styles.summaryLabel}>系统</div>
            <div className={styles.summaryValue}>{summary.system}</div>
          </div>
        </div>

        <div className={styles.filterRow}>
          <Segmented<HubView>
            value={view}
            onChange={(value) => setView(value)}
            options={[
              { label: "全部", value: "all" },
              { label: `审批 ${summary.approval}`, value: "approval" },
              { label: `调班 ${summary.schedule}`, value: "schedule" },
              { label: `系统 ${summary.system}`, value: "system" },
            ]}
          />
        </div>

        <div className={styles.searchRow}>
          <Input.Search
            allowClear
            placeholder="搜索标题、内容、审批单号、调班单号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.toggleRow}>
          <Typography.Text>只看可快捷审批</Typography.Text>
          <Switch checked={actionableOnly} onChange={setActionableOnly} />
        </div>

        {visibleChannels.length === 0 ? (
          <div className={styles.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="当前没有符合筛选条件的未读消息"
            />
          </div>
        ) : (
          <div className={styles.list}>
            {visibleChannels.map((channel) => (
              <section
                key={channel.key}
                className={`${styles.channel} ${styles[channel.variant]}`}
              >
                <div className={styles.channelTop}>
                  <div>
                    <div className={styles.channelLabel}>{channel.label}</div>
                    <div className={styles.channelTitle}>{channel.title}</div>
                  </div>
                  <Tag
                    color="processing"
                    bordered={false}
                    className={styles.channelCount}
                  >
                    {channel.items.length} 条未读
                  </Tag>
                </div>

                <div className={styles.snippetList}>
                  {channel.items.slice(0, 4).map((item) => {
                    const canQuickApprove =
                      item.message_type === "approval_pending" &&
                      Boolean(item.payload?.requestId);
                    const metaTags = buildMessageMetaTags(item.payload);

                    return (
                      <div key={item.id} className={styles.snippetCard}>
                        <button
                          type="button"
                          className={styles.snippet}
                          onClick={() => void markOneRead(item)}
                        >
                          <div className={styles.snippetTitle}>
                            {item.title}
                          </div>
                          <div className={styles.snippetContent}>
                            {item.content}
                          </div>
                          {metaTags.length ? (
                            <div className={styles.metaTags}>
                              {metaTags.map((tag) => (
                                <span key={tag} className={styles.metaTag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className={styles.snippetMeta}>
                            {item.create_time}
                          </div>
                        </button>

                        {canQuickApprove ? (
                          <div className={styles.quickActions}>
                            <Button
                              size="small"
                              type="primary"
                              loading={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(item)}
                            >
                              快捷同意
                            </Button>
                            <Button
                              size="small"
                              danger
                              loading={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(item)}
                            >
                              快捷驳回
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.channelFooter}>
                  <Typography.Text type="secondary">
                    点击消息会自动已读并跳转到对应页面
                  </Typography.Text>
                  <Button
                    type="link"
                    onClick={() => navigate("/system/messages")}
                  >
                    去消息中心
                  </Button>
                </div>
              </section>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
