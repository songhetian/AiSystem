import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Card,
  Checkbox,
  Col,
  Form,
  InputNumber,
  Row,
  Slider,
  Space,
  Switch,
  Typography,
  message,
  Button,
  Divider,
} from "antd";
import {
  SettingOutlined,
  ThunderboltOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { serviceApi } from "@/api/service";

const { Title, Text } = Typography;

const QUALITY_DIMENSIONS = [
  {
    key: "sensitive_word",
    label: "敏感词命中",
    desc: "检测对话中是否包含违规敏感词",
  },
  { key: "attitude", label: "客服态度", desc: "评估客服语气、礼貌程度" },
  { key: "response_time", label: "响应时效", desc: "检测客服回复是否及时" },
  {
    key: "demand_resolution",
    label: "需求解答",
    desc: "评估用户问题是否得到有效解答",
  },
  {
    key: "script_compliance",
    label: "话术规范",
    desc: "检测是否符合标准话术要求",
  },
];

const TAG_TYPES = [
  { key: "violation", label: "违规标签" },
  { key: "issue", label: "问题标签" },
  { key: "product", label: "商品标签" },
  { key: "emotion", label: "情绪标签" },
  { key: "loss", label: "流失标签" },
];

export function QualityInspectionConfig() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["service-quality-config"],
    queryFn: serviceApi.getQualityConfig,
  });

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        pass_score: config.pass_score ?? 80,
        qdrant_threshold: config.qdrant_threshold ?? 75,
        dimensions: config.dimensions ?? QUALITY_DIMENSIONS.map((d) => d.key),
        tag_types: config.tag_types ?? TAG_TYPES.map((t) => t.key),
        tag_precision_threshold: config.tag_precision_threshold ?? 70,
        auto_sync_qdrant: config.auto_sync_qdrant ?? false,
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: serviceApi.saveQualityConfig,
    onSuccess: () => {
      message.success("质检配置已保存，立即生效");
      queryClient.invalidateQueries({ queryKey: ["service-quality-config"] });
    },
    onError: () => message.error("保存失败，请重试"),
  });

  const syncMutation = useMutation({
    mutationFn: serviceApi.syncQdrantVectors,
    onSuccess: () => message.success("Qdrant 向量库同步完成"),
    onError: () => message.error("同步失败，请检查 Qdrant 服务状态"),
  });

  return (
    <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
      <Space direction="vertical" style={{ width: "100%" }} size={20}>
        {/* 合格分数线 */}
        <Card
          title={
            <Space>
              <SettingOutlined className="text-blue-600" />
              <Title level={5} style={{ margin: 0 }}>
                合格分数线配置
              </Title>
            </Space>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Row gutter={32} align="middle">
            <Col span={12}>
              <Form.Item
                name="pass_score"
                label={
                  <Text className="font-bold">质检合格分数线（0-100分）</Text>
                }
                rules={[{ required: true }]}
              >
                <Slider
                  min={0}
                  max={100}
                  marks={{ 0: "0", 60: "60", 80: "80", 100: "100" }}
                  tooltip={{ formatter: (v) => `${v}分` }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pass_score" noStyle>
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="分"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Alert
                type="info"
                message="得分 ≥ 此值判定为合格"
                showIcon
                className="rounded-lg"
              />
            </Col>
          </Row>
        </Card>

        {/* Qdrant 配置 */}
        <Card
          title={
            <Space>
              <ThunderboltOutlined className="text-purple-600" />
              <Title level={5} style={{ margin: 0 }}>
                Qdrant 向量库配置
              </Title>
            </Space>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Row gutter={32} align="middle">
            <Col span={12}>
              <Form.Item
                name="qdrant_threshold"
                label={<Text className="font-bold">相似度阈值（0-100）</Text>}
                rules={[{ required: true }]}
              >
                <Slider
                  min={0}
                  max={100}
                  marks={{ 0: "0", 50: "50", 75: "75", 100: "100" }}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="qdrant_threshold" noStyle>
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="%"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Alert
                type="info"
                message="相似度 ≥ 此值判定为匹配"
                showIcon
                className="rounded-lg"
              />
            </Col>
          </Row>

          <Divider />

          <Row gutter={16} align="middle">
            <Col span={12}>
              <Form.Item
                name="auto_sync_qdrant"
                label={
                  <Text className="font-bold">话术更新后自动同步向量库</Text>
                }
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Button
                icon={<ThunderboltOutlined />}
                loading={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
                className="font-bold"
              >
                立即手动同步 Qdrant
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 质检维度 */}
        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              质检维度配置
            </Title>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form.Item
            name="dimensions"
            label={<Text className="font-bold">勾选参与质检打分的维度</Text>}
          >
            <Checkbox.Group>
              <Space direction="vertical" size={12}>
                {QUALITY_DIMENSIONS.map((d) => (
                  <Checkbox key={d.key} value={d.key}>
                    <Space direction="vertical" size={0}>
                      <Text className="font-bold">{d.label}</Text>
                      <Text type="secondary" className="text-xs">
                        {d.desc}
                      </Text>
                    </Space>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </Card>

        {/* 标签生成规则 */}
        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              标签生成规则配置
            </Title>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form.Item
            name="tag_types"
            label={<Text className="font-bold">AI 自动生成的标签类型</Text>}
          >
            <Checkbox.Group>
              <Space wrap size={16}>
                {TAG_TYPES.map((t) => (
                  <Checkbox key={t.key} value={t.key}>
                    <Text className="font-bold">{t.label}</Text>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name="tag_precision_threshold"
            label={
              <Text className="font-bold">
                标签生成精准度阈值（低于此值不生成标签）
              </Text>
            }
          >
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Slider
                  min={0}
                  max={100}
                  marks={{ 0: "0", 50: "50", 70: "70", 100: "100" }}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="%"
                  style={{ width: "100%" }}
                />
              </Col>
            </Row>
          </Form.Item>
        </Card>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={saveMutation.isPending}
          size="large"
          className="font-bold bg-slate-900 border-none"
        >
          保存配置
        </Button>
      </Space>
    </Form>
  );
}
