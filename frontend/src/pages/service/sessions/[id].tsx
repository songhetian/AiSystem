import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Checkbox, Descriptions, Empty, Form, Input, List, Select, Space, Tag, Timeline, Typography, message } from 'antd';
import { io, type Socket } from 'socket.io-client';
import { useParams } from 'umi';
import { BaseModal } from '@/components/common/BaseModal';
import { Permission } from '@/components/permission/Permission';
import { knowledgeApi, type KnowledgeCategory, type KnowledgeTag } from '@/api/knowledge';
import { serviceApi, type ServiceCaseDraftResult, type ServiceSessionDetail, type ServiceSessionMessage } from '@/api/service';
import { useGlobalStore } from '@/models/global';

type EditableMessage = ServiceSessionMessage & { editableContent: string };
type SessionOccupancy = { userId: string; username: string; activity: string };

function resolveErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const messageValue = data?.message;
  if (Array.isArray(messageValue)) {
    return messageValue[0] ?? 'Operation failed';
  }
  return messageValue || (error as Error)?.message || 'Operation failed';
}

export default function ServiceSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const sessionId = params.id ?? '';
  const { token, currentUser } = useGlobalStore();
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [caseOpen, setCaseOpen] = useState(false);
  const [editableMessages, setEditableMessages] = useState<EditableMessage[]>([]);
  const [caseTags, setCaseTags] = useState<string[]>([]);
  const [occupancies, setOccupancies] = useState<SessionOccupancy[]>([]);
  const [caseForm] = Form.useForm();

  const { data, isLoading } = useQuery<ServiceSessionDetail>({
    queryKey: ['service-session-detail', sessionId],
    queryFn: () => serviceApi.getSession(sessionId),
    enabled: Boolean(sessionId)
  });

  const { data: categories = [] } = useQuery<KnowledgeCategory[]>({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeApi.listCategories(),
    enabled: caseOpen
  });

  const { data: tagLibrary = [] } = useQuery<KnowledgeTag[]>({
    queryKey: ['knowledge-tags', 'service_case'],
    queryFn: () => knowledgeApi.listTags({ source_type: 'service_case', enabled: '1' }),
    enabled: caseOpen
  });

  const categoryOptions = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    const walk = (items: KnowledgeCategory[], prefix = '') => {
      for (const item of items) {
        rows.push({ label: `${prefix}${item.category_name}`, value: item.id });
        if (item.children?.length) {
          walk(item.children, `${prefix}${item.category_name} / `);
        }
      }
    };
    walk(categories);
    return rows;
  }, [categories]);

  useEffect(() => {
    if (!caseOpen) {
      return;
    }

    const selected = (data?.messages ?? [])
      .filter((item) => selectedMessageIds.includes(item.id))
      .map((item) => ({ ...item, editableContent: item.content }));
    setEditableMessages(selected);
    setCaseTags(data?.tags ?? []);
    caseForm.setFieldsValue({
      title: data ? `案例复盘 - ${data.session_no}` : '',
      keyword: data?.tags?.join(', ') ?? '',
      content: '',
      tags: data?.tags ?? [],
      category_name: '服务案例',
      status: 'published',
      instruction: '请整理成可复用的服务案例，突出问题、关键应答和复盘建议。'
    });
  }, [caseForm, caseOpen, data, selectedMessageIds]);

  useEffect(() => {
    if (!token || !sessionId) {
      return;
    }

    const socket: Socket = io('/ws', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket']
    });

    const handlePresence = (event: { occupancies?: SessionOccupancy[] }) => {
      setOccupancies(event.occupancies ?? []);
    };

    socket.on('service-session.presence.snapshot', handlePresence);
    socket.on('service-session.presence.changed', handlePresence);
    socket.emit('service-session.watch', { sessionId });

    return () => {
      socket.emit('service-session.unwatch', { sessionId });
      socket.off('service-session.presence.snapshot', handlePresence);
      socket.off('service-session.presence.changed', handlePresence);
      socket.close();
    };
  }, [sessionId, token]);

  useEffect(() => {
    if (!token || !sessionId || !caseOpen) {
      return;
    }

    const socket: Socket = io('/ws', {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket']
    });

    socket.emit('service-session.presence.start', { sessionId, activity: 'case_edit' });

    return () => {
      socket.emit('service-session.presence.stop', { sessionId, activity: 'case_edit' });
      socket.close();
    };
  }, [caseOpen, sessionId, token]);

  const otherOccupancies = useMemo(
    () => occupancies.filter((item) => item.userId !== currentUser?.id),
    [currentUser?.id, occupancies]
  );

  const occupancyText = useMemo(() => {
    if (!otherOccupancies.length) {
      return '';
    }

    return otherOccupancies
      .map((item) => `${item.username} 正在${item.activity === 'case_edit' ? '编辑案例' : item.activity === 'analyze' ? '执行质检' : '处理中'}`)
      .join('；');
  }, [otherOccupancies]);

  const occupancySummary = useMemo(() => {
    const analyzing = otherOccupancies.filter((item) => item.activity === 'analyze');
    const caseEditing = otherOccupancies.filter((item) => item.activity === 'case_edit');

    return {
      total: otherOccupancies.length,
      analyzing,
      caseEditing
    };
  }, [otherOccupancies]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const socket: Socket = io('/ws', {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket']
      });
      socket.emit('service-session.presence.start', { sessionId, activity: 'analyze' });
      try {
        return await serviceApi.analyzeSession(sessionId, { mode: 'manual' });
      } finally {
        socket.emit('service-session.presence.stop', { sessionId, activity: 'analyze' });
        socket.close();
      }
    },
    onSuccess: async () => {
      message.success('AI 质检已完成');
      await queryClient.invalidateQueries({ queryKey: ['service-session-detail', sessionId] });
      await queryClient.invalidateQueries({ queryKey: ['service-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['service-ai-overview'] });
    },
    onError: (error: unknown) => {
      message.warning(resolveErrorMessage(error));
    }
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      const values = await caseForm.validateFields(['instruction']);
      return serviceApi.generateCaseDraft(sessionId, {
        instruction: values.instruction,
        messages: editableMessages.map((item) => ({
          id: item.id,
          sender_type: item.sender_type,
          sender_name: item.sender_name,
          content: item.editableContent,
          sent_at: item.sent_at
        }))
      });
    },
    onSuccess: (result: ServiceCaseDraftResult) => {
      caseForm.setFieldsValue({
        title: result.title,
        keyword: result.keyword,
        content: result.content,
        tags: result.tags
      });
      setCaseTags(result.tags);
      setEditableMessages((current) =>
        current.map((item) => {
          const matched = result.transcript.find((row) => row.id === item.id);
          return matched ? { ...item, editableContent: matched.content } : item;
        })
      );
      message.success('AI 已完成案例整理');
    },
    onError: (error: unknown) => {
      message.warning(resolveErrorMessage(error));
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const values = await caseForm.validateFields();
      return serviceApi.archiveCase(sessionId, {
        title: values.title,
        content: values.content,
        keyword: values.keyword,
        category_id: values.category_id,
        category_name: values.category_name,
        status: values.status,
        instruction: values.instruction,
        tags: caseTags,
        messages: editableMessages.map((item) => ({
          id: item.id,
          sender_type: item.sender_type,
          sender_name: item.sender_name,
          content: item.editableContent,
          sent_at: item.sent_at
        }))
      });
    },
    onSuccess: async () => {
      message.success('案例已入库');
      setCaseOpen(false);
      setSelectedMessageIds([]);
      await queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    },
    onError: (error: unknown) => {
      message.warning(resolveErrorMessage(error));
    }
  });

  if (!sessionId) {
    return <Empty description="Missing session ID" />;
  }

  if (!isLoading && !data) {
    return <Empty description="Session not found" />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        loading={isLoading}
        title={`会话详情 ${data?.session_no ?? ''}`}
        extra={
          <Space>
            <Permission code="knowledge:article:create">
              <Button disabled={!selectedMessageIds.length} onClick={() => setCaseOpen(true)}>
                案例入库
              </Button>
            </Permission>
            <Permission code="service:quality:analyze">
              <Button type="primary" loading={analyzeMutation.isPending} onClick={() => analyzeMutation.mutate()}>
                重新分析
              </Button>
            </Permission>
          </Space>
        }
      >
        {occupancyText ? <Alert type="warning" showIcon message={occupancyText} style={{ marginBottom: 16 }} /> : null}
        <Card
          size="small"
          style={{ marginBottom: 16, background: occupancySummary.total ? '#fffbe6' : '#f6ffed', borderColor: occupancySummary.total ? '#ffe58f' : '#b7eb8f' }}
        >
          <Space wrap size={[8, 8]}>
            <Tag color={occupancySummary.total ? 'warning' : 'success'}>{occupancySummary.total ? '当前有人处理中' : '当前空闲'}</Tag>
            <Typography.Text type="secondary">
              质检中 {occupancySummary.analyzing.length} 人 / 案例编辑中 {occupancySummary.caseEditing.length} 人
            </Typography.Text>
            {occupancySummary.analyzing.map((item) => (
              <Tag key={`analyze-${item.userId}`}>{item.username} · 质检</Tag>
            ))}
            {occupancySummary.caseEditing.map((item) => (
              <Tag key={`case-${item.userId}`} color="purple">
                {item.username} · 案例
              </Tag>
            ))}
          </Space>
        </Card>
        <Descriptions column={3}>
          <Descriptions.Item label="客户">{data?.customer_nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="客服">{data?.agent_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{data?.status || '-'}</Descriptions.Item>
          <Descriptions.Item label="平台">{data?.platform_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="部门">{data?.dept_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="店铺">{data?.shop_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="自动标签" span={3}>
            <Space wrap>
              {data?.tags?.length ? data.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Typography.Text type="secondary">暂无标签</Typography.Text>}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card loading={isLoading} title="AI 分析结果">
        {data?.analyses?.length ? (
          <Timeline
            items={data.analyses.map((item) => ({
              children: (
                <Space direction="vertical" size={6}>
                  <Space wrap>
                    <Tag color={item.quality_passed ? 'success' : 'error'}>{item.quality_passed ? '合格' : '不合格'}</Tag>
                    <Tag color={item.loss_risk_level === 'high' ? 'error' : item.loss_risk_level === 'medium' ? 'warning' : 'success'}>
                      {item.loss_risk_level}
                    </Tag>
                    <Typography.Text type="secondary">{item.analyzed_at}</Typography.Text>
                  </Space>
                  <Typography.Text>质检分：{item.quality_score}</Typography.Text>
                  <Typography.Text>流失风险分：{item.loss_risk_score}</Typography.Text>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>{item.summary || '-'}</Typography.Paragraph>
                  {item.top_faqs?.length ? (
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      高频问题：{item.top_faqs.map((faq) => `${faq.question}(${faq.count})`).join('，')}
                    </Typography.Paragraph>
                  ) : null}
                </Space>
              )
            }))}
          />
        ) : (
          <Empty description="暂无分析结果" />
        )}
      </Card>

      <Card loading={isLoading} title={`会话消息流${selectedMessageIds.length ? ` · 已选 ${selectedMessageIds.length} 条` : ''}`}>
        <Alert
          type="info"
          showIcon
          message="勾选需要入库的对话后，可以在案例入库中逐条修改内容，也可以使用 AI 整体整理。若有人同时发起质检或案例入库，系统会直接提示冲突。"
          style={{ marginBottom: 16 }}
        />
        {data?.messages?.length ? (
          <List
            dataSource={data.messages}
            renderItem={(item) => {
              const checked = selectedMessageIds.includes(item.id);
              return (
                <List.Item>
                  <Space align="start" style={{ width: '100%' }}>
                    <Checkbox
                      checked={checked}
                      onChange={(event) =>
                        setSelectedMessageIds((current) =>
                          event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)
                        )
                      }
                    />
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color={item.sender_type === 'agent' ? 'blue' : 'default'}>{item.sender_type}</Tag>
                          <span>{item.sender_name || '-'}</span>
                          <Typography.Text type="secondary">{item.sent_at}</Typography.Text>
                        </Space>
                      }
                      description={item.content}
                    />
                  </Space>
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description="暂无消息记录" />
        )}
      </Card>

      <BaseModal
        open={caseOpen}
        title="案例入库"
        width={920}
        confirmLoading={archiveMutation.isPending}
        onCancel={() => setCaseOpen(false)}
        onOk={() => archiveMutation.mutate()}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {occupancyText ? <Alert type="warning" showIcon message={occupancyText} /> : null}
          <Alert
            type="warning"
            showIcon
            message="案例入库会锁定当前会话的案例操作窗口；如果其他人同时入库或质检，接口会返回冲突提示。"
          />
          <Form form={caseForm} layout="vertical" initialValues={{ status: 'published' }}>
            <Form.Item label="AI 整理要求" name="instruction">
              <Input.TextArea rows={3} placeholder="描述你希望 AI 如何整理案例内容" />
            </Form.Item>
            <Space style={{ marginBottom: 12 }}>
              <Button onClick={() => draftMutation.mutate()} loading={draftMutation.isPending} disabled={!editableMessages.length}>
                AI 整体整理
              </Button>
            </Space>
            <Form.Item label="案例标题" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="分类选择" name="category_id">
              <Select allowClear options={categoryOptions} />
            </Form.Item>
            <Form.Item label="分类名称" name="category_name">
              <Input />
            </Form.Item>
            <Form.Item label="关键词" name="keyword">
              <Input />
            </Form.Item>
            <Form.Item label="标签确认" name="tags">
              <Select
                mode="tags"
                value={caseTags}
                onChange={(value) => {
                  const nextTags = value.map((item) => String(item).trim()).filter(Boolean);
                  setCaseTags(nextTags);
                  caseForm.setFieldValue('tags', nextTags);
                }}
                options={tagLibrary.map((item) => ({ label: item.tag_name, value: item.tag_name }))}
                placeholder="自动生成后可直接修改，不满意可以手动增删"
              />
            </Form.Item>
            <Form.Item label="案例内容" name="content" rules={[{ required: true }]}>
              <Input.TextArea rows={10} />
            </Form.Item>
          </Form>

          <div>
            <Typography.Text strong>自动标签</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {caseTags.length ? caseTags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Typography.Text type="secondary">暂无标签</Typography.Text>}
              </Space>
            </div>
          </div>

          <div>
            <Typography.Text strong>已选对话编辑</Typography.Text>
            <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
              {editableMessages.map((item) => (
                <Card key={item.id} size="small">
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space>
                      <Tag color={item.sender_type === 'agent' ? 'blue' : 'default'}>{item.sender_type}</Tag>
                      <Typography.Text>{item.sender_name || '-'}</Typography.Text>
                      <Typography.Text type="secondary">{item.sent_at}</Typography.Text>
                    </Space>
                    <Input.TextArea
                      rows={3}
                      value={item.editableContent}
                      onChange={(event) =>
                        setEditableMessages((current) =>
                          current.map((row) => (row.id === item.id ? { ...row, editableContent: event.target.value } : row))
                        )
                      }
                    />
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        </Space>
      </BaseModal>
    </Space>
  );
}
