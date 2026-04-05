import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
  message
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { approvalApi, type ApprovalNode, type ApprovalPerson, type ApprovalTemplate } from '@/api/approval';
import { BaseDrag, BaseDragHandle, type BaseDragContainer } from '@/components/drag/BaseDrag';
import { Permission } from '@/components/permission/Permission';

type PersonBucket = ApprovalPerson & { source: 'available' | 'approvers' | 'copies' };

const nodeTypeMeta: Record<ApprovalNode['type'], { label: string; color: string }> = {
  start: { label: '开始', color: 'blue' },
  approval: { label: '审批', color: 'processing' },
  branch: { label: '分支', color: 'warning' },
  copy: { label: '抄送', color: 'purple' },
  end: { label: '结束', color: 'default' }
};

function cloneTemplate(template: ApprovalTemplate) {
  return JSON.parse(JSON.stringify(template)) as ApprovalTemplate;
}

export default function ApprovalProcessPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['approval-templates'],
    queryFn: approvalApi.listTemplates
  });

  const { data: people = [] } = useQuery({
    queryKey: ['approval-people'],
    queryFn: approvalApi.listPeople
  });

  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    if (selectedTemplate?.nodes.length && !selectedTemplate.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(selectedTemplate.nodes[0].id);
    }
  }, [selectedNodeId, selectedTemplate]);

  const selectedNode = useMemo(
    () => selectedTemplate?.nodes.find((node) => node.id === selectedNodeId),
    [selectedNodeId, selectedTemplate]
  );

  const filteredTemplates = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return templates;
    }
    return templates.filter((item) =>
      [item.name, item.type, item.platformName, item.departmentName].some((field) => field.toLowerCase().includes(normalized))
    );
  }, [keyword, templates]);

  const saveTemplateMutation = useMutation({
    mutationFn: approvalApi.saveTemplate,
    onSuccess: async (template) => {
      await queryClient.invalidateQueries({ queryKey: ['approval-templates'] });
      setSelectedTemplateId(template.id);
      message.success('审批流程已自动保存');
    },
    onError: (error: Error) => {
      message.error(error.message || '审批流程保存失败，已恢复拖拽前状态');
    }
  });

  const updateTemplate = async (updater: (template: ApprovalTemplate) => ApprovalTemplate) => {
    if (!selectedTemplate) {
      return;
    }
    await saveTemplateMutation.mutateAsync(updater(cloneTemplate(selectedTemplate)));
  };

  const nodeContainers: BaseDragContainer<ApprovalNode>[] = useMemo(
    () => [
      {
        id: 'workflow',
        title: '流程节点',
        description: '拖拽调整审批顺序，完成后自动保存。失败时恢复旧顺序。',
        emptyText: '先新增审批节点',
        items: selectedTemplate?.nodes ?? []
      }
    ],
    [selectedTemplate?.nodes]
  );

  const personContainers: BaseDragContainer<PersonBucket>[] = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    const selectedIds = new Set([...selectedNode.approvers, ...selectedNode.copies].map((person) => person.id));
    return [
      {
        id: 'available',
        title: '可选人员',
        description: '从这里拖拽到审批人或抄送人列表。',
        emptyText: '全部已分配',
        items: people
          .filter((person) => !selectedIds.has(person.id))
          .map((person) => ({ ...person, source: 'available' as const }))
      },
      {
        id: 'approvers',
        title: '审批人',
        description: '支持多人会签/或签的排序编排。',
        emptyText: '拖入审批人',
        items: selectedNode.approvers.map((person) => ({ ...person, source: 'approvers' as const }))
      },
      {
        id: 'copies',
        title: '抄送人',
        description: '拖拽人员到此列表即可建立抄送关系。',
        emptyText: '拖入抄送人',
        items: selectedNode.copies.map((person) => ({ ...person, source: 'copies' as const }))
      }
    ];
  }, [people, selectedNode]);

  const pendingCount = useMemo(
    () =>
      selectedTemplate?.nodes.reduce((count, node) => {
        if (node.type === 'approval' || node.type === 'branch') {
          return count + Math.max(1, node.approvers.length);
        }
        return count;
      }, 0) ?? 0,
    [selectedTemplate]
  );

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card>
        <Space direction="vertical" size={4} style={{ display: 'flex' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            审批流程配置
          </Typography.Title>
          <Typography.Text type="secondary">
            按补充文档要求，节点顺序与审批人/抄送人分配均采用拖拽方式，并在拖拽完成后自动保存。
          </Typography.Text>
        </Space>
      </Card>

      <Row gutter={16} align="stretch">
        <Col span={7}>
          <Card
            title="审批模板"
            loading={templatesLoading}
            extra={
              <Input.Search
                allowClear
                placeholder="搜索模板 / 类型 / 平台"
                style={{ width: 220 }}
                onChange={(event) => setKeyword(event.target.value)}
              />
            }
            styles={{ body: { padding: 12 } }}
          >
            {filteredTemplates.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的审批模板" />
            ) : (
              <List
                dataSource={filteredTemplates}
                renderItem={(item) => {
                  const active = item.id === selectedTemplateId;
                  return (
                    <List.Item
                      onClick={() => setSelectedTemplateId(item.id)}
                      style={{
                        padding: 14,
                        marginBottom: 10,
                        cursor: 'pointer',
                        borderRadius: 14,
                        border: `1px solid ${active ? '#1677ff' : '#f0f0f0'}`,
                        background: active ? '#f0f7ff' : '#fff'
                      }}
                    >
                      <Space direction="vertical" size={8} style={{ display: 'flex', width: '100%' }}>
                        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Typography.Text strong>{item.name}</Typography.Text>
                          <Tag color={item.status === 'enabled' ? 'success' : 'default'}>
                            {item.status === 'enabled' ? '启用中' : '已停用'}
                          </Tag>
                        </Space>
                        <Space wrap>
                          <Tag>{item.type}</Tag>
                          <Tag>{item.platformName}</Tag>
                          <Tag>{item.departmentName}</Tag>
                        </Space>
                        <Typography.Text type="secondary">{item.description}</Typography.Text>
                        <Typography.Text type="secondary">最近更新：{item.updatedAt}</Typography.Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={selectedTemplate ? `${selectedTemplate.name} / 节点编排` : '节点编排'}
            extra={
              <Permission code="approval:process:update">
                <Button
                  icon={<PlusOutlined />}
                  disabled={!selectedTemplate}
                  onClick={() => {
                    void updateTemplate((template) => {
                      const endNode = template.nodes[template.nodes.length - 1];
                      return {
                        ...template,
                        nodes: [
                          ...template.nodes.slice(0, Math.max(template.nodes.length - 1, 1)),
                          {
                            id: `node-${Date.now()}`,
                            name: `审批节点 ${template.nodes.length - 1}`,
                            type: 'approval',
                            timeoutHours: 24,
                            approvers: [],
                            copies: []
                          },
                          endNode
                        ]
                      };
                    });
                  }}
                >
                  新增审批节点
                </Button>
              </Permission>
            }
          >
            {selectedTemplate ? (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Alert
                  type="info"
                  showIcon
                  message="拖拽节点调整审批顺序，系统会立即保存新的流程结构。若保存失败，会恢复为拖拽前顺序。"
                />
                <BaseDrag
                  containers={nodeContainers}
                  onChange={async (containers) => {
                    const workflow = containers[0]?.items ?? [];
                    await updateTemplate((template) => ({ ...template, nodes: workflow }));
                  }}
                  renderItem={({ item, dragHandle, isOverlay }) => (
                    <Card
                      size="small"
                      onClick={() => setSelectedNodeId(item.id)}
                      style={{
                        borderRadius: 16,
                        borderColor: item.id === selectedNodeId ? '#1677ff' : undefined,
                        boxShadow: isOverlay ? '0 16px 40px rgba(0, 0, 0, 0.14)' : 'none'
                      }}
                    >
                      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space align="start">
                          <BaseDragHandle {...dragHandle} />
                          <Space direction="vertical" size={6}>
                            <Space>
                              <Typography.Text strong>{item.name}</Typography.Text>
                              <Tag color={nodeTypeMeta[item.type].color}>{nodeTypeMeta[item.type].label}</Tag>
                            </Space>
                            <Typography.Text type="secondary">
                              {item.type === 'branch'
                                ? item.condition || '请配置分支条件'
                                : `审批时限 ${item.timeoutHours || 0} 小时`}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              审批人 {item.approvers.length} 人 / 抄送人 {item.copies.length} 人
                            </Typography.Text>
                          </Space>
                        </Space>
                        {item.type !== 'start' && item.type !== 'end' ? (
                          <Permission code="approval:process:update">
                            <Button
                              type="link"
                              danger
                              onClick={(event) => {
                                event.stopPropagation();
                                void updateTemplate((template) => ({
                                  ...template,
                                  nodes: template.nodes.filter((node) => node.id !== item.id)
                                }));
                              }}
                            >
                              删除
                            </Button>
                          </Permission>
                        ) : null}
                      </Space>
                    </Card>
                  )}
                />
                <Card size="small" title="流程预览" styles={{ body: { paddingBottom: 8 } }}>
                  <Space wrap>
                    {selectedTemplate.nodes.map((node, index) => (
                      <Space key={node.id}>
                        <Tag color={nodeTypeMeta[node.type].color}>{node.name}</Tag>
                        {index < selectedTemplate.nodes.length - 1 ? <Typography.Text type="secondary">→</Typography.Text> : null}
                      </Space>
                    ))}
                  </Space>
                </Card>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择审批模板" />
            )}
          </Card>
        </Col>

        <Col span={7}>
          <Card title={selectedNode ? `${selectedNode.name} / 节点配置` : '节点配置'}>
            {selectedTemplate && selectedNode ? (
              <Space direction="vertical" size={16} style={{ display: 'flex' }}>
                <Typography.Text type="secondary">
                  节点类型：{nodeTypeMeta[selectedNode.type].label}，当前共分配 {selectedNode.approvers.length} 名审批人、{selectedNode.copies.length}
                  名抄送人。
                </Typography.Text>
                <Permission code="approval:process:update">
                  <Segmented
                    block
                    value={selectedNode.type}
                    options={[
                      { label: '审批', value: 'approval' },
                      { label: '分支', value: 'branch' },
                      { label: '抄送', value: 'copy' }
                    ]}
                    onChange={(value) => {
                      void updateTemplate((template) => ({
                        ...template,
                        nodes: template.nodes.map((node) =>
                          node.id === selectedNode.id ? { ...node, type: value as ApprovalNode['type'] } : node
                        )
                      }));
                    }}
                    disabled={selectedNode.type === 'start' || selectedNode.type === 'end'}
                  />
                </Permission>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Typography.Text>启用模板</Typography.Text>
                  <Permission code="approval:process:update">
                    <Switch
                      checked={selectedTemplate.status === 'enabled'}
                      onChange={(checked) => {
                        void updateTemplate((template) => ({
                          ...template,
                          status: checked ? 'enabled' : 'disabled'
                        }));
                      }}
                    />
                  </Permission>
                </Space>
                <Alert
                  type="success"
                  showIcon
                  message={`预计参与审批人数 ${pendingCount} 人，当前节点时限 ${selectedNode.timeoutHours || 0} 小时。`}
                />
                <Permission code="approval:process:update">
                  <BaseDrag
                    containers={personContainers}
                    onChange={async (containers) => {
                      const approvers = (containers.find((container) => container.id === 'approvers')?.items ?? []).map(
                        ({ source, ...person }) => person
                      );
                      const copies = (containers.find((container) => container.id === 'copies')?.items ?? []).map(
                        ({ source, ...person }) => person
                      );

                      await updateTemplate((template) => ({
                        ...template,
                        nodes: template.nodes.map((node) =>
                          node.id === selectedNode.id
                            ? {
                                ...node,
                                approvers,
                                copies
                              }
                            : node
                        )
                      }));
                    }}
                    renderItem={({ item, dragHandle, isOverlay }) => (
                      <Card
                        size="small"
                        style={{
                          borderRadius: 14,
                          background: isOverlay ? '#fff' : undefined
                        }}
                      >
                        <Space align="start" style={{ width: '100%' }}>
                          <BaseDragHandle {...dragHandle} />
                          <Space direction="vertical" size={2}>
                            <Typography.Text strong>{item.name}</Typography.Text>
                            <Typography.Text type="secondary">
                              {item.department} / {item.title}
                            </Typography.Text>
                            <Typography.Text type="secondary">工号：{item.employeeNo}</Typography.Text>
                          </Space>
                        </Space>
                      </Card>
                    )}
                  />
                </Permission>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个流程节点后可配置审批人和抄送人" />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
