import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { BulbOutlined, ReloadOutlined, TagsOutlined } from "@ant-design/icons";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { GlobalLoading } from "@/components/common/GlobalLoading";
import { useDebounce } from "@/hooks/useDebounce";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  confirmBatchAction,
  handleExportWithProgress,
} from "@/utils/ui-helpers";
import {
  knowledgeApi,
  type KnowledgeAiTagSuggestion,
  type KnowledgeTag,
  type KnowledgeTagImpact,
} from "@/api/knowledge";

/* ─────────────────── Tab 1: 标签管理 ─────────────────── */
function TagManageTab() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);
  const [sourceType, setSourceType] = useState<string>();
  const [enabled, setEnabled] = useState<string>("all");
  const [editing, setEditing] = useState<KnowledgeTag | null>(null);
  const [mergeSource, setMergeSource] = useState<KnowledgeTag | null>(null);
  const [open, setOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [impactVisible, setImpactVisible] = useState(false);
  const [impactData, setImpactData] = useState<KnowledgeTagImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [form] = Form.useForm();
  const [mergeForm] = Form.useForm();
  const { clearDraft } = useFormDraft(form, "knowledge-tag-form");

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      setOpen(true);
      form.resetFields();
      form.setFieldsValue({ sort: 0 });
    },
    "Ctrl+r": () => refresh(),
    Escape: () => {
      setOpen(false);
      setMergeOpen(false);
      setImpactVisible(false);
    },
  });

  const { data = [], isLoading } = useQuery<KnowledgeTag[]>({
    queryKey: ["knowledge-tags", debouncedKeyword, sourceType, enabled],
    queryFn: () =>
      knowledgeApi.listTags({
        keyword: debouncedKeyword || undefined,
        source_type: sourceType || undefined,
        enabled: enabled === "all" ? undefined : enabled,
      }) as unknown as Promise<KnowledgeTag[]>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["knowledge-tags"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        return knowledgeApi.updateTag(
          editing.id,
          values as Partial<KnowledgeTag> & { tag_name: string },
        );
      }
      return knowledgeApi.createTag(
        values as Partial<KnowledgeTag> & { tag_name: string },
      );
    },
    onSuccess: async () => {
      message.success(editing ? "标签已更新" : "标签已创建");
      setOpen(false);
      setEditing(null);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: () => {
      message.error(editing ? "标签更新失败，请重试" : "标签创建失败，请重试");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      enabled: nextEnabled,
    }: {
      id: string;
      enabled: boolean;
    }) =>
      nextEnabled ? knowledgeApi.enableTag(id) : knowledgeApi.disableTag(id),
    onSuccess: async () => {
      message.success("标签状态已更新");
      await refresh();
    },
    onError: () => {
      message.error("标签状态更新失败，请重试");
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async (values: { target_tag_id: string }) => {
      if (!mergeSource) throw new Error("缺少源标签");
      return knowledgeApi.mergeTag(mergeSource.id, values);
    },
    onSuccess: async () => {
      message.success("标签合并成功");
      setMergeOpen(false);
      setMergeSource(null);
      mergeForm.resetFields();
      await refresh();
    },
    onError: () => {
      message.error("标签合并失败，请重试");
    },
  });

  const mergeOptions = useMemo(
    () =>
      data
        .filter(
          (item: KnowledgeTag) =>
            item.id !== mergeSource?.id && !item.is_deleted,
        )
        .map((item: KnowledgeTag) => ({
          label: `${item.tag_name}${item.source_type ? ` (${item.source_type})` : ""}`,
          value: item.id,
        })),
    [data, mergeSource?.id],
  );

  const handleViewImpact = async (record: KnowledgeTag) => {
    setImpactVisible(true);
    setImpactData(null);
    setImpactLoading(true);
    try {
      const result = (await knowledgeApi.getTagImpact(
        record.id,
      )) as unknown as KnowledgeTagImpact;
      setImpactData(result);
    } catch {
      message.error("获取影响范围失败");
      setImpactVisible(false);
    } finally {
      setImpactLoading(false);
    }
  };

  const sourceTypeLabel: Record<string, string> = {
    service_quality: "质检来源",
    service_case: "案例来源",
    service_faq: "FAQ来源",
  };

  const columns: ProColumns<KnowledgeTag>[] = useMemo(
    () => [
      {
        title: "标签名称",
        dataIndex: "tag_name",
        render: (_, record) => (
          <Space size={6}>
            <Tag
              color={record.color || "blue"}
              style={{ fontWeight: 600, fontSize: 13 }}
            >
              {record.tag_name}
            </Tag>
          </Space>
        ),
      },
      {
        title: "标签编码",
        dataIndex: "tag_code",
        width: 180,
        render: (_, record) => (
          <Typography.Text style={{ color: "#334155", fontWeight: 500 }}>
            {record.tag_code || "-"}
          </Typography.Text>
        ),
      },
      {
        title: "来源类型",
        dataIndex: "source_type",
        width: 140,
        render: (_, record) => (
          <Tag>
            {sourceTypeLabel[record.source_type ?? ""] ||
              record.source_type ||
              "手动创建"}
          </Tag>
        ),
      },
      {
        title: "颜色",
        width: 100,
        render: (_, record) =>
          record.color ? (
            <Tag color={record.color} style={{ fontWeight: 600 }}>
              {record.color}
            </Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "排序",
        dataIndex: "sort",
        width: 70,
      },
      {
        title: "状态",
        width: 100,
        render: (_, record) => (
          <Tag
            color={record.is_deleted ? "default" : "success"}
            style={{ fontWeight: 600 }}
          >
            {record.is_deleted ? "已停用" : "启用"}
          </Tag>
        ),
      },
      {
        title: "操作",
        width: 280,
        render: (_, record) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              style={{ color: "#0f172a", fontWeight: 600 }}
              onClick={() => handleViewImpact(record)}
            >
              影响范围
            </Button>
            <Permission code="knowledge:tag:update">
              <Button
                type="link"
                size="small"
                style={{ color: "#0f172a", fontWeight: 600 }}
                onClick={() => {
                  setEditing(record);
                  setOpen(true);
                  form.setFieldsValue(record);
                }}
              >
                编辑
              </Button>
            </Permission>
            <Permission code="knowledge:tag:update">
              <Button
                type="link"
                size="small"
                disabled={!!record.is_deleted}
                style={{
                  color: record.is_deleted ? "#94a3b8" : "#0f172a",
                  fontWeight: 600,
                }}
                onClick={() => {
                  setMergeSource(record);
                  setMergeOpen(true);
                  mergeForm.resetFields();
                }}
              >
                合并
              </Button>
            </Permission>
            <Permission code="knowledge:tag:update">
              <Switch
                size="small"
                checked={!record.is_deleted}
                loading={toggleMutation.isPending}
                onChange={async (checked) => {
                  if (checked) {
                    toggleMutation.mutate({ id: record.id, enabled: true });
                    return;
                  }
                  const impact = (await knowledgeApi.getTagImpact(
                    record.id,
                  )) as unknown as KnowledgeTagImpact;
                  Modal.confirm({
                    title: `停用标签：${record.tag_name}`,
                    content: `该标签当前命中 ${impact.session_count} 条会话、${impact.article_count} 篇知识文章。停用后不会删除已有数据，但后续确认时将不再作为启用标签出现。`,
                    okText: "确认停用",
                    cancelText: "取消",
                    onOk: async () => {
                      await toggleMutation.mutateAsync({
                        id: record.id,
                        enabled: false,
                      });
                    },
                  });
                }}
              />
            </Permission>
          </Space>
        ),
      },
    ],
    [data, form, mergeForm, toggleMutation.isPending],
  );

  return (
    <>
      <GlobalLoading loading={isLoading}>
        <Card
          title={
            <Space>
              <TagsOutlined />
              <span style={{ color: "#0f172a", fontWeight: 700 }}>
                标签管理
              </span>
            </Space>
          }
          styles={{ header: { borderBottom: "2px solid #e2e8f0" } }}
          extra={
            <Space wrap>
              <Input.Search
                allowClear
                placeholder="搜索标签名称/编码"
                style={{ width: 240 }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Select
                allowClear
                placeholder="来源类型"
                style={{ width: 160 }}
                value={sourceType}
                onChange={(value) => setSourceType(value)}
                options={[
                  { label: "质检来源", value: "service_quality" },
                  { label: "案例来源", value: "service_case" },
                  { label: "FAQ来源", value: "service_faq" },
                ]}
              />
              <Select
                style={{ width: 120 }}
                value={enabled}
                onChange={setEnabled}
                options={[
                  { label: "全部状态", value: "all" },
                  { label: "仅启用", value: "1" },
                  { label: "仅停用", value: "0" },
                ]}
              />
              <Permission code="knowledge:tag:create">
                <Button
                  type="primary"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                    form.resetFields();
                    form.setFieldsValue({ sort: 0 });
                  }}
                >
                  新建标签
                </Button>
              </Permission>
            </Space>
          }
        >
          <BaseTable<KnowledgeTag>
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={isLoading}
          />
        </Card>
      </GlobalLoading>

      {/* 新建/编辑标签弹窗 */}
      <BaseModal
        open={open}
        title={editing ? "编辑标签" : "新建标签"}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => saveMutation.mutate(values));
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ sort: 0 }}>
          <Form.Item
            label="标签名称"
            name="tag_name"
            rules={[{ required: true, message: "请输入标签名称" }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item label="标签编码" name="tag_code">
            <Input placeholder="留空则自动生成" />
          </Form.Item>
          <Form.Item label="来源类型" name="source_type">
            <Select
              allowClear
              placeholder="请选择来源类型"
              options={[
                { label: "质检来源", value: "service_quality" },
                { label: "案例来源", value: "service_case" },
                { label: "FAQ来源", value: "service_faq" },
              ]}
            />
          </Form.Item>
          <Form.Item label="标签颜色" name="color">
            <Select
              allowClear
              placeholder="请选择颜色"
              options={[
                "blue",
                "green",
                "gold",
                "orange",
                "purple",
                "red",
                "cyan",
              ].map((value) => ({
                label: (
                  <Tag color={value} style={{ marginRight: 0 }}>
                    {value}
                  </Tag>
                ),
                value,
              }))}
            />
          </Form.Item>
          <Form.Item label="排序值" name="sort">
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="数值越小越靠前"
            />
          </Form.Item>
        </Form>
      </BaseModal>

      {/* 合并标签弹窗 */}
      <BaseModal
        open={mergeOpen}
        title={mergeSource ? `合并标签：${mergeSource.tag_name}` : "合并标签"}
        confirmLoading={mergeMutation.isPending}
        onCancel={() => {
          setMergeOpen(false);
          setMergeSource(null);
          mergeForm.resetFields();
        }}
        onOk={() => {
          mergeForm
            .validateFields()
            .then((values) =>
              mergeMutation.mutate(values as { target_tag_id: string }),
            );
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="合并后，源标签将被停用，其关联的会话和文章中的标签将替换为目标标签，操作不可撤销。"
          style={{ marginBottom: 16 }}
        />
        <Form form={mergeForm} layout="vertical">
          <Form.Item
            label="合并目标标签"
            name="target_tag_id"
            rules={[{ required: true, message: "请选择目标标签" }]}
          >
            <Select
              showSearch
              placeholder="选择要保留的目标标签"
              optionFilterProp="label"
              options={mergeOptions}
            />
          </Form.Item>
        </Form>
      </BaseModal>

      {/* 影响范围弹窗 */}
      <Modal
        open={impactVisible}
        title={
          <Space>
            <TagsOutlined />
            <span style={{ color: "#0f172a", fontWeight: 700 }}>
              标签影响范围：{impactData?.tag?.tag_name}
            </span>
          </Space>
        }
        footer={<Button onClick={() => setImpactVisible(false)}>关闭</Button>}
        onCancel={() => setImpactVisible(false)}
        width={640}
        loading={impactLoading}
      >
        {impactData ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item
                label={
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    命中会话数
                  </span>
                }
              >
                <Badge
                  count={impactData.session_count}
                  showZero
                  color={impactData.session_count > 0 ? "#3b82f6" : "#94a3b8"}
                />
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    命中文章数
                  </span>
                }
              >
                <Badge
                  count={impactData.article_count}
                  showZero
                  color={impactData.article_count > 0 ? "#10b981" : "#94a3b8"}
                />
              </Descriptions.Item>
            </Descriptions>

            {impactData.sample_sessions.length > 0 && (
              <div>
                <Typography.Text
                  strong
                  style={{
                    color: "#0f172a",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  关联会话（前5条）
                </Typography.Text>
                <List
                  size="small"
                  bordered
                  dataSource={impactData.sample_sessions}
                  renderItem={(item: { id: string; session_no?: string }) => (
                    <List.Item>
                      <Typography.Text
                        style={{ color: "#334155", fontWeight: 500 }}
                      >
                        会话 #{item.session_no || item.id}
                      </Typography.Text>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {impactData.sample_articles.length > 0 && (
              <div>
                <Typography.Text
                  strong
                  style={{
                    color: "#0f172a",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  关联文章（前5条）
                </Typography.Text>
                <List
                  size="small"
                  bordered
                  dataSource={impactData.sample_articles}
                  renderItem={(item: {
                    id: string;
                    title: string;
                    source_type?: string;
                  }) => (
                    <List.Item>
                      <Space>
                        <Typography.Text
                          style={{ color: "#334155", fontWeight: 500 }}
                        >
                          {item.title}
                        </Typography.Text>
                        {item.source_type && <Tag>{item.source_type}</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {impactData.session_count === 0 &&
              impactData.article_count === 0 && (
                <Empty
                  description={
                    <span style={{ color: "#64748b" }}>
                      该标签暂未关联任何会话或文章
                    </span>
                  }
                />
              )}
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

/* ─────────────────── Tab 2: AI 建议标签 ─────────────────── */
function AiSuggestTab() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+r": () => refetch(),
    Escape: () => setSelected([]),
  });

  const {
    data: suggestions = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<KnowledgeAiTagSuggestion[]>({
    queryKey: ["knowledge-ai-tag-suggestions"],
    queryFn: () => knowledgeApi.getAiTagSuggestions(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const batchMutation = useMutation({
    mutationFn: (names: string[]) => knowledgeApi.batchCreateTags(names),
    onSuccess: async (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      if (successCount > 0) message.success(`成功导入 ${successCount} 个标签`);
      if (failCount > 0)
        message.warning(`${failCount} 个标签导入失败（可能已存在）`);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["knowledge-tags"] });
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-ai-tag-suggestions"],
      });
    },
    onError: () => {
      message.error("批量导入失败，请重试");
    },
  });

  const singleMutation = useMutation({
    mutationFn: (name: string) => knowledgeApi.batchCreateTags([name]),
    onSuccess: async (results) => {
      if (results[0]?.success) {
        message.success(`"${results[0].tag_name}" 已添加为标签`);
      } else {
        message.warning(`添加失败：${results[0]?.error ?? "未知错误"}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["knowledge-tags"] });
      await queryClient.invalidateQueries({
        queryKey: ["knowledge-ai-tag-suggestions"],
      });
    },
    onError: () => {
      message.error("添加标签失败，请重试");
    },
  });

  const allNames = suggestions.map((s) => s.suggested_name);
  const isAllSelected =
    allNames.length > 0 && allNames.every((n) => selected.includes(n));

  const toggleAll = () => {
    setSelected(isAllSelected ? [] : allNames);
  };

  const toggleOne = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleBatchImport = () => {
    confirmBatchAction(
      selected.length,
      "导入",
      () => batchMutation.mutate(selected),
    );
  };

  return (
    <GlobalLoading loading={isLoading}>
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: "#f59e0b" }} />
            <span style={{ color: "#0f172a", fontWeight: 700 }}>
              AI 建议标签
            </span>
            <Tag color="orange">基于会话 AI 分析的高频关键词</Tag>
          </Space>
        }
        styles={{ header: { borderBottom: "2px solid #e2e8f0" } }}
        extra={
          <Space>
            {selected.length > 0 && (
              <Permission code="knowledge:tag:create">
                <Button
                  type="primary"
                  loading={batchMutation.isPending}
                  onClick={handleBatchImport}
                >
                  批量导入选中（{selected.length} 个）
                </Button>
              </Permission>
            )}
            <Tooltip title="重新从 AI 分析数据中提取建议">
              <Button
                icon={<ReloadOutlined />}
                loading={isFetching}
                onClick={() => refetch()}
              >
                刷新建议
              </Button>
            </Tooltip>
          </Space>
        }
      >
        {suggestions.length === 0 && !isLoading ? (
          <Empty
            description={
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                暂无 AI 建议标签。系统将从客服会话 AI
                分析中自动提取高频关键词，若暂无数据请先完成会话 AI 质检分析。
              </span>
            }
          />
        ) : (
          <>
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Checkbox checked={isAllSelected} onChange={toggleAll}>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  全选（共 {suggestions.length} 条）
                </span>
              </Checkbox>
              {selected.length > 0 && (
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  已选 {selected.length} 个
                </span>
              )}
            </div>
            <List
              loading={isLoading}
              dataSource={suggestions}
              grid={{ gutter: 12, column: 2 }}
              renderItem={(item) => {
                const isChecked = selected.includes(item.suggested_name);
                return (
                  <List.Item>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        border: `1px solid ${isChecked ? "#3b82f6" : "#e2e8f0"}`,
                        borderRadius: 8,
                        background: isChecked ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onClick={() => toggleOne(item.suggested_name)}
                    >
                      <Space size={8}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleOne(item.suggested_name)}
                        />
                        <Typography.Text
                          strong
                          style={{ color: "#0f172a", fontSize: 14 }}
                        >
                          {item.suggested_name}
                        </Typography.Text>
                        <Tag color="blue" style={{ marginLeft: 4 }}>
                          命中 {item.hit_count} 次
                        </Tag>
                      </Space>
                      <Permission code="knowledge:tag:create">
                        <Button
                          type="link"
                          size="small"
                          style={{
                            color: "#0f172a",
                            fontWeight: 600,
                            marginLeft: 8,
                          }}
                          loading={singleMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            singleMutation.mutate(item.suggested_name);
                          }}
                        >
                          一键添加
                        </Button>
                      </Permission>
                    </div>
                  </List.Item>
                );
              }}
            />
          </>
        )}
      </Card>
    </GlobalLoading>
  );
}

/* ─────────────────── 主页面（两个 Tab） ─────────────────── */
export default function KnowledgeTagsPage() {
  return (
    <Tabs
      defaultActiveKey="manage"
      type="card"
      size="large"
      style={{ "--tab-active-color": "#0f172a" } as React.CSSProperties}
      items={[
        {
          key: "manage",
          label: (
            <span style={{ fontWeight: 600, color: "inherit" }}>
              <TagsOutlined style={{ marginRight: 6 }} />
              标签管理
            </span>
          ),
          children: <TagManageTab />,
        },
        {
          key: "ai-suggest",
          label: (
            <span style={{ fontWeight: 600, color: "inherit" }}>
              <BulbOutlined style={{ marginRight: 6 }} />
              AI 建议标签
            </span>
          ),
          children: <AiSuggestTab />,
        },
      ]}
    />
  );
}
