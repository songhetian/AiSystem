import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Typography, message } from 'antd';
import { useNavigate } from 'umi';
import { approvalApi, type ApprovalPerson } from '@/api/approval';
import { systemApi, type SystemMessagePayload, type SystemMessageRecord } from '@/api/system';
import { BaseModal } from '@/components/common/BaseModal';
import { createIdempotencyKey } from '@/utils/request';
import { buildMessageMetaTags, resolveMessageAppearance, type NoticeVariant } from '@/utils/message-center';
import styles from './RealtimeNotificationCenter.module.css';

export interface RealtimeMessageEvent {
  action?: 'created' | 'read' | 'read-all';
  messageId?: string;
  messageType?: string;
  bizType?: string;
  bizId?: string;
  route?: string;
  emittedAt?: string;
}

interface ChannelSnippet {
  id: string;
  title: string;
  content: string;
  route?: string;
  messageType: string;
  payload?: SystemMessagePayload;
  metaTags: string[];
}

interface Appearance {
  channelKey: string;
  variant: NoticeVariant;
  label: string;
  title: string;
  priority: number;
  lifetimeMs: number;
}

interface ChannelNotice extends Appearance {
  route?: string;
  count: number;
  lastAt: number;
  snippets: ChannelSnippet[];
}

type ActionType = 'approve' | 'reject' | 'transfer';

const MAX_VISIBLE_NOTICES = 3;
const MAX_SNIPPETS = 4;

function buildSnippet(message: SystemMessageRecord): ChannelSnippet {
  return {
    id: message.id,
    title: message.title,
    content: message.content,
    route: message.route,
    messageType: message.message_type,
    payload: message.payload,
    metaTags: buildMessageMetaTags(message.payload)
  };
}

function getVariantClassName(variant: NoticeVariant) {
  return `${variant[0].toUpperCase()}${variant.slice(1)}`;
}

function canQuickApprove(snippet?: ChannelSnippet) {
  return snippet?.messageType === 'approval_pending' && Boolean(snippet.payload?.requestId);
}

export function RealtimeNotificationCenter({ lastEvent }: { lastEvent?: RealtimeMessageEvent }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ChannelNotice[]>([]);
  const [expandedKey, setExpandedKey] = useState<string>();
  const [pendingActionKey, setPendingActionKey] = useState<string>();
  const [actionType, setActionType] = useState<ActionType>();
  const [actionTarget, setActionTarget] = useState<{ channelKey: string; snippet: ChannelSnippet } | null>(null);
  const actionKeyRef = useRef<string>();
  const timersRef = useRef<Record<string, number>>({});
  const [form] = Form.useForm();

  const { data: people = [] } = useQuery<ApprovalPerson[]>({
    queryKey: ['approval-request-people'],
    queryFn: approvalApi.listPeople
  });

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!lastEvent?.messageId || lastEvent.action !== 'created') {
      return;
    }

    let disposed = false;

    const consume = async () => {
      const unreadMessages = (await systemApi.listMessages({ read_status: 0 })) as SystemMessageRecord[];
      if (disposed) {
        return;
      }

      const current = unreadMessages.find((item) => item.id === lastEvent.messageId) ?? unreadMessages[0];
      if (!current) {
        return;
      }

      const appearance = resolveMessageAppearance(current.message_type);
      const snippet = buildSnippet(current);

      setItems((previous) => {
        const existing = previous.find((item) => item.channelKey === appearance.channelKey);
        const nextItems = existing
          ? previous.map((item) => {
              if (item.channelKey !== appearance.channelKey) {
                return item;
              }

              return {
                ...item,
                ...appearance,
                route: current.route ?? item.route,
                count: item.count + 1,
                lastAt: Date.now(),
                snippets: [snippet, ...item.snippets.filter((entry) => entry.id !== snippet.id)].slice(0, MAX_SNIPPETS)
              };
            })
          : [
              {
                ...appearance,
                route: current.route,
                count: 1,
                lastAt: Date.now(),
                snippets: [snippet]
              },
              ...previous
            ];

        return nextItems
          .sort((left, right) => {
            if (right.priority !== left.priority) {
              return right.priority - left.priority;
            }

            return right.lastAt - left.lastAt;
          })
          .slice(0, MAX_VISIBLE_NOTICES);
      });
    };

    void consume();

    return () => {
      disposed = true;
    };
  }, [lastEvent]);

  useEffect(() => {
    for (const item of items) {
      window.clearTimeout(timersRef.current[item.channelKey]);
      if (expandedKey === item.channelKey || pendingActionKey === item.channelKey || actionTarget?.channelKey === item.channelKey) {
        continue;
      }

      timersRef.current[item.channelKey] = window.setTimeout(() => {
        setItems((previous) => previous.filter((entry) => entry.channelKey !== item.channelKey));
        setExpandedKey((current) => (current === item.channelKey ? undefined : current));
      }, item.lifetimeMs);
    }
  }, [actionTarget?.channelKey, expandedKey, items, pendingActionKey]);

  const refreshQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['system-messages'] });
    await queryClient.invalidateQueries({ queryKey: ['system-message-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['approval-request-stats'] });
  };

  const dismissChannel = (channelKey: string) => {
    setItems((previous) => previous.filter((entry) => entry.channelKey !== channelKey));
    setExpandedKey((current) => (current === channelKey ? undefined : current));
    setPendingActionKey((current) => (current === channelKey ? undefined : current));
    setActionTarget((current) => (current?.channelKey === channelKey ? null : current));
  };

  const markSnippetRead = async (channelKey: string, snippetId: string, route?: string) => {
    setPendingActionKey(channelKey);
    try {
      await systemApi.markMessageRead(snippetId);
      setItems((previous) =>
        previous
          .map((item) => {
            if (item.channelKey !== channelKey) {
              return item;
            }

            const snippets = item.snippets.filter((snippet) => snippet.id !== snippetId);
            return {
              ...item,
              count: Math.max(0, item.count - 1),
              snippets
            };
          })
          .filter((item) => item.count > 0 && item.snippets.length > 0)
      );
      await refreshQueries();

      if (route) {
        navigate(route);
        dismissChannel(channelKey);
      }
    } finally {
      setPendingActionKey((current) => (current === channelKey ? undefined : current));
    }
  };

  const markChannelRead = async (item: ChannelNotice) => {
    setPendingActionKey(item.channelKey);
    try {
      await Promise.all(item.snippets.map((snippet) => systemApi.markMessageRead(snippet.id)));
      dismissChannel(item.channelKey);
      await refreshQueries();
    } finally {
      setPendingActionKey((current) => (current === item.channelKey ? undefined : current));
    }
  };

  const approveMutation = useMutation({
    mutationFn: async ({ channelKey, snippet, comment }: { channelKey: string; snippet: ChannelSnippet; comment?: string }) => {
      const requestId = snippet.payload?.requestId;
      if (!requestId) {
        return;
      }

      await approvalApi.approveRequest(
        requestId,
        { comment },
        {
          idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`realtime-approve-${requestId}`))
        }
      );
      await systemApi.markMessageRead(snippet.id);
      dismissChannel(channelKey);
    },
    onSuccess: async () => {
      message.success('审批已同意');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refreshQueries();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ channelKey, snippet, comment }: { channelKey: string; snippet: ChannelSnippet; comment?: string }) => {
      const requestId = snippet.payload?.requestId;
      if (!requestId) {
        return;
      }

      await approvalApi.rejectRequest(
        requestId,
        { comment },
        {
          idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`realtime-reject-${requestId}`))
        }
      );
      await systemApi.markMessageRead(snippet.id);
      dismissChannel(channelKey);
    },
    onSuccess: async () => {
      message.success('审批已驳回');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refreshQueries();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const transferMutation = useMutation({
    mutationFn: async ({
      channelKey,
      snippet,
      assigneeId,
      comment
    }: {
      channelKey: string;
      snippet: ChannelSnippet;
      assigneeId: string;
      comment?: string;
    }) => {
      const requestId = snippet.payload?.requestId;
      if (!requestId) {
        return;
      }

      await approvalApi.transferRequest(
        requestId,
        { assigneeId, comment },
        {
          idempotencyKey: actionKeyRef.current ?? (actionKeyRef.current = createIdempotencyKey(`realtime-transfer-${requestId}`))
        }
      );
      await systemApi.markMessageRead(snippet.id);
      dismissChannel(channelKey);
    },
    onSuccess: async () => {
      message.success('审批已转审');
      setActionType(undefined);
      setActionTarget(null);
      form.resetFields();
      actionKeyRef.current = undefined;
      await refreshQueries();
    },
    onError: () => {
      actionKeyRef.current = undefined;
    }
  });

  const actionPending = approveMutation.isPending || rejectMutation.isPending || transferMutation.isPending;
  const visibleItems = useMemo(() => items.slice(0, MAX_VISIBLE_NOTICES), [items]);

  const openActionModal = (type: ActionType, channelKey: string, snippet: ChannelSnippet) => {
    setActionType(type);
    setActionTarget({ channelKey, snippet });
    actionKeyRef.current = undefined;
    form.resetFields();
  };

  const submitAction = async () => {
    if (!actionType || !actionTarget) {
      return;
    }

    const values = await form.validateFields();

    if (actionType === 'approve') {
      approveMutation.mutate({
        channelKey: actionTarget.channelKey,
        snippet: actionTarget.snippet,
        comment: values.comment
      });
      return;
    }

    if (actionType === 'reject') {
      rejectMutation.mutate({
        channelKey: actionTarget.channelKey,
        snippet: actionTarget.snippet,
        comment: values.comment
      });
      return;
    }

    transferMutation.mutate({
      channelKey: actionTarget.channelKey,
      snippet: actionTarget.snippet,
      assigneeId: values.assigneeId,
      comment: values.comment
    });
  };

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.viewport}>
        {visibleItems.map((item) => {
          const primary = item.snippets[0];
          const extraCount = Math.max(0, item.count - 1);
          const variantClassName = getVariantClassName(item.variant);
          const isExpanded = expandedKey === item.channelKey;
          const isPending = pendingActionKey === item.channelKey || actionTarget?.channelKey === item.channelKey;
          const actionable = canQuickApprove(primary);

          return (
            <section key={item.channelKey} className={`${styles.card} ${styles[item.variant]} ${isExpanded ? styles.expanded : ''}`}>
              <div className={styles.glowOrb} />
              <div className={styles.topline}>
                <div className={styles.channel}>
                  <span className={`${styles.iconShell} ${styles[`iconShell${variantClassName}`]}`}>
                    <span className={styles.iconCore} />
                    <span className={`${styles.iconMark} ${styles[`iconMark${variantClassName}`]}`} />
                  </span>
                  <div>
                    <span className={styles.eyebrow}>{item.label}</span>
                    <div className={styles.title}>{item.title}</div>
                  </div>
                </div>
                <div className={styles.meta}>
                  {item.count > 1 ? <span className={styles.count}>{item.count} 条</span> : <span className={styles.single}>NEW</span>}
                  <button type="button" className={styles.close} onClick={() => dismissChannel(item.channelKey)}>
                    x
                  </button>
                </div>
              </div>

              <div className={styles.progressTrack}>
                <span
                  className={styles.progressBar}
                  style={{
                    animationDuration: `${item.lifetimeMs}ms`,
                    animationPlayState: isExpanded || isPending ? 'paused' : 'running'
                  }}
                />
              </div>

              <div className={styles.body}>
                <div className={styles.hero}>
                  <p className={styles.headline}>{primary?.title ?? '新消息'}</p>
                  <p className={styles.content}>{primary?.content ?? '你有一条新的系统提醒。'}</p>
                  {primary?.metaTags.length ? (
                    <div className={styles.metaTags}>
                      {primary.metaTags.map((tag) => (
                        <span key={tag} className={styles.metaTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {actionable ? (
                  <div className={styles.quickApprovalBar}>
                    <Button size="small" type="primary" loading={actionPending && actionType === 'approve'} onClick={() => openActionModal('approve', item.channelKey, primary)}>
                      同意
                    </Button>
                    <Button size="small" danger loading={actionPending && actionType === 'reject'} onClick={() => openActionModal('reject', item.channelKey, primary)}>
                      驳回
                    </Button>
                    <Button size="small" onClick={() => openActionModal('transfer', item.channelKey, primary)}>
                      转审
                    </Button>
                  </div>
                ) : null}

                {item.snippets.length > 1 ? (
                  <div className={styles.stream}>
                    {item.snippets.slice(1, isExpanded ? item.snippets.length : 3).map((snippet) => (
                      <button
                        key={snippet.id}
                        type="button"
                        className={styles.streamItem}
                        onClick={() => {
                          if (snippet.route) {
                            void markSnippetRead(item.channelKey, snippet.id, snippet.route);
                          }
                        }}
                      >
                        <span className={styles.streamDot} />
                        <div className={styles.streamText}>
                          <div className={styles.streamTitle}>{snippet.title}</div>
                          <div className={styles.streamContent}>{snippet.content}</div>
                          {snippet.metaTags.length ? (
                            <div className={styles.streamMetaTags}>
                              {snippet.metaTags.slice(0, 2).map((tag) => (
                                <span key={tag} className={styles.streamMetaTag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className={styles.footer}>
                  <span className={styles.summary}>
                    {extraCount > 0 ? `同通道另外 ${extraCount} 条消息已聚合到当前提醒` : '当前通道仅有这一条新消息'}
                  </span>
                  <div className={styles.actions}>
                    {item.count > 1 ? (
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => setExpandedKey((current) => (current === item.channelKey ? undefined : item.channelKey))}
                      >
                        {isExpanded ? '收起消息流' : '展开消息流'}
                      </button>
                    ) : null}
                    <button type="button" className={styles.secondaryAction} disabled={isPending} onClick={() => void markChannelRead(item)}>
                      {isPending ? '处理中' : '标记已读'}
                    </button>
                    {item.route ? (
                      <button
                        type="button"
                        className={styles.action}
                        onClick={() => {
                          if (primary?.id) {
                            void markSnippetRead(item.channelKey, primary.id, item.route);
                            return;
                          }

                          navigate(item.route);
                          dismissChannel(item.channelKey);
                        }}
                      >
                        打开通道
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <BaseModal
        open={Boolean(actionType && actionTarget)}
        title={actionType === 'approve' ? '实时提醒快捷同意' : actionType === 'reject' ? '实时提醒快捷驳回' : '实时提醒快捷转审'}
        confirmLoading={actionPending}
        onCancel={() => {
          setActionType(undefined);
          setActionTarget(null);
          form.resetFields();
        }}
        onOk={() => void submitAction()}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="消息标题">
            <Typography.Text>{actionTarget?.snippet.title ?? '-'}</Typography.Text>
          </Form.Item>
          <Form.Item label="审批单号">
            <Typography.Text>{actionTarget?.snippet.payload?.requestNo ?? '-'}</Typography.Text>
          </Form.Item>
          {actionType === 'transfer' ? (
            <Form.Item label="转交给" name="assigneeId" rules={[{ required: true, message: '请选择转交对象' }]}>
              <Select
                showSearch
                placeholder="选择处理人"
                options={people.map((person) => ({
                  label: `${person.name} · ${person.department} · ${person.title}`,
                  value: person.id
                }))}
                optionFilterProp="label"
              />
            </Form.Item>
          ) : null}
          <Form.Item
            label={actionType === 'approve' ? '审批意见' : actionType === 'reject' ? '驳回原因' : '转审备注'}
            name="comment"
            rules={actionType === 'reject' ? [{ required: true, message: '请填写驳回原因' }] : undefined}
          >
            <Input.TextArea rows={4} placeholder="输入处理意见" maxLength={200} showCount />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
